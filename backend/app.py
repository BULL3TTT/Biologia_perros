from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import timedelta
import os
import time
from urllib.parse import urlparse
from functools import wraps

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'root')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(seconds=int(os.getenv('JWT_EXPIRATION', '1800')))
app.config['JWT_ALGORITHM'] = 'HS256'
CORS(app)
jwt = JWTManager(app)

# Database connection
def get_db_connection():
    max_retries = 5
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            database_url = os.getenv('DATABASE_URL', 'postgresql://root:root@postgres:5432/biologia_db')
            if database_url.startswith('postgresql://'):
                # Parse DATABASE_URL format: postgresql://user:password@host:port/database
                parsed = urlparse(database_url)
                database_name = parsed.path[1:] if parsed.path.startswith('/') else parsed.path
                conn = psycopg2.connect(
                    host=parsed.hostname,
                    database=database_name,
                    user=parsed.username,
                    password=parsed.password,
                    port=parsed.port or 5432,
                    connect_timeout=5
                )
            else:
                conn = psycopg2.connect(
                    host=os.getenv('DB_HOST', 'postgres'),
                    database=os.getenv('DB_NAME', 'biologia_db'),
                    user=os.getenv('DB_USER', 'root'),
                    password=os.getenv('DB_PASSWORD', 'root'),
                    port=os.getenv('DB_PORT', '5432'),
                    connect_timeout=5
                )
            return conn
        except psycopg2.OperationalError as e:
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                raise e

# Correct answers mapping
CORRECT_ANSWERS = {
    1: "CODON",
    2: "EL ARN CONTIENE URACILO",
    3: "RETIRAR LOS INTRONES - TRANSCRIPCION",
    4: "PROTEINAS",
    5: "ES EL PROCESO DE SINTESIS DE ARN",
    6: "AUG",
    7: "TRANSCRIPCION Y TRADUCCION",
    8: "CORTE Y EMPALME",
    9: "FLUJO DE INFORMACION GENETICA DE DNA A PROTEINA",
    10: "BASES NITROGENADAS - ARNm",
    11: "ADN HELICASA",
    12: "URACILO",
    13: "TIMINA",
    14: "LIGASA",
    15: "TOPOISOMERASA",
    16: "PRIMASA",
    17: "FRAGMENTOS DE OKAZAKI"
}

QUESTIONS = {
    1: "¿Como se llama el triplete de nucleos que el ribosoma lee? Contiene la informacion para unir un aminoacido especifico?",
    2: "¿QUE DIFERENCIA IMPORTANTE EXISTE ENTRE EL ADN Y EL ARN?",
    3: "¿CUAL ES LA FUNCION DEL SPLICING Y EN QUE ETAPA DEL DOGMA CENTRAL DE LA BIOLOGIA PARTICIPA?",
    4: "LA TRADUCCION ES UN PROCESO QUE PERMITE FORMAR",
    5: "¿QUE ES EL PROCESO DE TRANSCRIPCION?",
    6: "¿QUE CODON SEÑALA DONDE COMIENZA LA TRADUCCION?",
    7: "MECANISMOS INVOLUCRADOS EN LA SINTESIS DE UNA PROTEINA",
    8: "¿A QUE SE DEBE SOMETER EL TRANSCRITO DE ARN EN EUCARIOTAS?",
    9: "A QUE SE REFIERE EL DOGMA CENTRAL DE LA BIOLOGIA",
    10: "LOS CODONES SON TRIPLETES DE ___ PRESENTES EN ___",
    11: "ENZIMA QUE ROMPE LOS PUENTES DE HIDROGENO, DESENRROLLANDOLOS EN 2 CADENAS ANTIPARALELAS",
    12: "EL ADN NO CONTIENE",
    13: "EL ARN NO CONTIENE",
    14: "ENZIMA QUE UNE LOS FRAGMENTOS DE OKAZAKI",
    15: "ENZIMA QUE DESARROLLA LA CADENA DE ADN",
    16: "ENZIMA ENCARGADA DE LA SINTESIS DE LOS PRIMEROS CREADORES PARA LA SINTESIS DE ADN",
    17: "FRAGMENTO DE ADN QUE SE SINTETIZA EN CONTRA DE LA DIRECCION DE LA HORQUILLA DE REPLICACION"
}

# Admin authentication decorator
def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        jwt_data = get_jwt()
        role = jwt_data.get('role')
        if role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

@app.route('/api/generate-token', methods=['POST'])
def generate_token():
    try:
        data = request.get_json()
        
        nombre_completo = data.get('nombreCompleto')
        grado = data.get('grado')
        grupo = data.get('grupo')
        correo_institucional = data.get('correoInstitucional')
        
        if not all([nombre_completo, grado, grupo, correo_institucional]):
            return jsonify({'error': 'Todos los campos son obligatorios'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if user exists
        cur.execute(
            "SELECT id FROM users WHERE correo_institucional = %s",
            (correo_institucional,)
        )
        user = cur.fetchone()
        
        if user:
            user_id = user[0]
        else:
            # Create new user
            cur.execute(
                """INSERT INTO users (nombre_completo, grado, grupo, correo_institucional)
                   VALUES (%s, %s, %s, %s) RETURNING id""",
                (nombre_completo, grado, grupo, correo_institucional)
            )
            user_id = cur.fetchone()[0]
            conn.commit()
        
        cur.close()
        conn.close()
        
        # Create JWT token
        # Use user_id as string identity and additional data as claims
        access_token = create_access_token(
            identity=str(user_id),
            additional_claims={
                'nombre_completo': nombre_completo,
                'correo_institucional': correo_institucional,
                'role': 'user'
            }
        )
        
        return jsonify({
            'token': access_token,
            'user_id': user_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/submit-answers', methods=['POST'])
@jwt_required()
def submit_answers():
    try:
        # Get identity (user_id as string) and additional claims
        user_id_str = get_jwt_identity()
        if not user_id_str:
            return jsonify({'error': 'Usuario no autenticado'}), 401
        
        # Get additional claims from JWT
        jwt_data = get_jwt()
        user_id = int(user_id_str)
        nombre_completo = jwt_data.get('nombre_completo', '')
        
        if not user_id:
            return jsonify({'error': 'ID de usuario no encontrado en el token'}), 400
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No se recibieron datos'}), 400
        
        answers = data.get('answers', {})
        
        if not answers:
            return jsonify({'error': 'No se recibieron respuestas'}), 400
        
        if not isinstance(answers, dict):
            return jsonify({'error': 'Las respuestas deben ser un objeto'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        correct_count = 0
        total_questions = len(CORRECT_ANSWERS)
        
        # Save each answer - ensure keys are converted to integers
        # Handle both string keys (from JSON) and integer keys (if JSON parser kept them as ints)
        for pregunta_id_key, respuesta_usuario in answers.items():
            try:
                # Convert key to int whether it's a string or already an int
                if isinstance(pregunta_id_key, str):
                    pregunta_id = int(pregunta_id_key)
                elif isinstance(pregunta_id_key, int):
                    pregunta_id = pregunta_id_key
                else:
                    pregunta_id = int(pregunta_id_key)
            except (ValueError, TypeError):
                continue  # Skip invalid question IDs
            
            if not isinstance(respuesta_usuario, str):
                respuesta_usuario = str(respuesta_usuario)
            
            respuesta_correcta = CORRECT_ANSWERS.get(pregunta_id)
            pregunta_texto = QUESTIONS.get(pregunta_id, '')
            
            if respuesta_correcta:
                es_correcta = respuesta_usuario.strip().upper() == respuesta_correcta.strip().upper()
                if es_correcta:
                    correct_count += 1
                
                cur.execute(
                    """INSERT INTO user_responses 
                       (user_id, nombre_completo, pregunta_id, pregunta_texto, respuesta_usuario, respuesta_correcta, es_correcta)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (user_id, nombre_completo, pregunta_id, pregunta_texto, respuesta_usuario, respuesta_correcta, es_correcta)
                )
        
        conn.commit()
        cur.close()
        conn.close()
        
        score = (correct_count / total_questions) * 100
        
        return jsonify({
            'success': True,
            'score': round(score, 2),
            'correct_answers': correct_count,
            'total_questions': total_questions
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Error al procesar las respuestas'}), 500

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Usuario y contraseña son requeridos'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute(
            "SELECT * FROM admin_users WHERE username = %s",
            (username,)
        )
        admin = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if not admin:
            return jsonify({'error': 'Credenciales inválidas'}), 401
        
        # Password check - use environment variables for production
        admin_username = os.getenv('ADMIN_USERNAME', 'admin')
        admin_password = os.getenv('ADMIN_PASSWORD', '')
        
        if not admin_password:
            return jsonify({'error': 'Configuración de administrador no válida'}), 500
        
        if username == admin_username and password == admin_password:
            access_token = create_access_token(
                identity=username,
                additional_claims={
                    'role': 'admin'
                }
            )
            return jsonify({'token': access_token}), 200
        else:
            return jsonify({'error': 'Credenciales inválidas'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/results', methods=['GET'])
@admin_required
def get_results():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                u.id,
                u.nombre_completo,
                u.grado,
                u.grupo,
                u.correo_institucional,
                u.fecha_registro,
                COUNT(ur.id) as total_respuestas,
                SUM(CASE WHEN ur.es_correcta THEN 1 ELSE 0 END) as respuestas_correctas,
                ROUND((SUM(CASE WHEN ur.es_correcta THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(ur.id), 0)) * 100, 2) as puntuacion
            FROM users u
            LEFT JOIN user_responses ur ON u.id = ur.user_id
            GROUP BY u.id, u.nombre_completo, u.grado, u.grupo, u.correo_institucional, u.fecha_registro
            ORDER BY puntuacion DESC NULLS LAST, u.fecha_registro DESC
        """)
        
        results = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return jsonify([dict(row) for row in results]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/top-scores', methods=['GET'])
@admin_required
def get_top_scores():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("""
            SELECT 
                u.nombre_completo,
                u.correo_institucional,
                COUNT(ur.id) as total_respuestas,
                SUM(CASE WHEN ur.es_correcta THEN 1 ELSE 0 END) as respuestas_correctas,
                ROUND((SUM(CASE WHEN ur.es_correcta THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(ur.id), 0)) * 100, 2) as puntuacion
            FROM users u
            LEFT JOIN user_responses ur ON u.id = ur.user_id
            GROUP BY u.id, u.nombre_completo, u.correo_institucional
            HAVING COUNT(ur.id) > 0
            ORDER BY puntuacion DESC, respuestas_correctas DESC
            LIMIT 3
        """)
        
        results = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return jsonify([dict(row) for row in results]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def get_stats():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Total users
        cur.execute("SELECT COUNT(*) as total FROM users")
        total_users = cur.fetchone()['total']
        
        # Total responses
        cur.execute("SELECT COUNT(*) as total FROM user_responses")
        total_responses = cur.fetchone()['total']
        
        # Average score
        cur.execute("""
            SELECT 
                ROUND(AVG(CASE 
                    WHEN total_respuestas > 0 THEN 
                        (respuestas_correctas::numeric / total_respuestas) * 100 
                    ELSE 0 
                END), 2) as promedio
            FROM (
                SELECT 
                    COUNT(ur.id) as total_respuestas,
                    SUM(CASE WHEN ur.es_correcta THEN 1 ELSE 0 END) as respuestas_correctas
                FROM users u
                LEFT JOIN user_responses ur ON u.id = ur.user_id
                GROUP BY u.id
            ) subquery
        """)
        avg_score = cur.fetchone()['promedio'] or 0
        
        # Question accuracy
        cur.execute("""
            SELECT 
                pregunta_id,
                pregunta_texto,
                COUNT(*) as total_respuestas,
                SUM(CASE WHEN es_correcta THEN 1 ELSE 0 END) as correctas,
                ROUND((SUM(CASE WHEN es_correcta THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 2) as porcentaje_correcto
            FROM user_responses
            GROUP BY pregunta_id, pregunta_texto
            ORDER BY pregunta_id
        """)
        question_stats = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return jsonify({
            'total_users': total_users,
            'total_responses': total_responses,
            'average_score': avg_score,
            'question_stats': [dict(row) for row in question_stats]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)

