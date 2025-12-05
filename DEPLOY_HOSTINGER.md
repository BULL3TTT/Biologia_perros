# Guía de Despliegue en Hostinger

Esta guía te ayudará a desplegar tu aplicación de Biología en Hostinger.

## Requisitos Previos

1. Acceso SSH a tu servidor Hostinger
2. Docker y Docker Compose instalados en el servidor
3. Dominio configurado (opcional pero recomendado)

## Paso 1: Preparar el Servidor

### Conectar por SSH

```bash
ssh usuario@tu-servidor-hostinger.com
```

### Instalar Docker (si no está instalado)

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt install docker-compose -y

# Agregar tu usuario al grupo docker (opcional)
sudo usermod -aG docker $USER
```

## Paso 2: Subir el Proyecto

### Opción A: Usando Git (Recomendado)

```bash
# En tu servidor
cd /home/usuario
git clone https://github.com/tu-usuario/Biologia_perros.git
cd Biologia_perros
```

### Opción B: Usando SCP/SFTP

```bash
# Desde tu máquina local
scp -r Biologia_perros usuario@tu-servidor:/home/usuario/
```

## Paso 3: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
nano .env
```

Agrega las siguientes variables (cambia los valores por seguridad):

```env
# Base de datos
POSTGRES_USER=tu_usuario_db
POSTGRES_PASSWORD=tu_password_seguro_db
POSTGRES_DB=biologia_db

# JWT
JWT_SECRET=tu_secret_key_muy_segura_aqui
JWT_EXPIRATION=1800

# Admin
ADMIN_USERNAME=tu_usuario_admin
ADMIN_PASSWORD=tu_password_admin_seguro

# Flask
FLASK_DEBUG=False

# Database URL (se genera automáticamente, pero puedes personalizarlo)
DATABASE_URL=postgresql://tu_usuario_db:tu_password_seguro_db@postgres:5432/biologia_db
```

**IMPORTANTE**: 
- Usa contraseñas seguras y únicas
- No compartas este archivo públicamente
- El archivo `.env` debe estar en `.gitignore`

## Paso 4: Actualizar docker-compose.yml

Asegúrate de que `docker-compose.yml` use las variables de entorno:

```yaml
services:
  postgres:
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
  
  backend:
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRATION: ${JWT_EXPIRATION}
      ADMIN_USERNAME: ${ADMIN_USERNAME}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      FLASK_DEBUG: ${FLASK_DEBUG}
```

## Paso 5: Construir y Ejecutar

```bash
# Construir las imágenes
docker-compose build

# Iniciar los servicios
docker-compose up -d

# Ver los logs
docker-compose logs -f
```

## Paso 6: Configurar Nginx (Recomendado)

Si Hostinger te permite configurar Nginx, crea un archivo de configuración:

```bash
sudo nano /etc/nginx/sites-available/biologia
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Habilita el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/biologia /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Paso 7: Configurar SSL/HTTPS (Recomendado)

Usa Let's Encrypt para obtener un certificado SSL gratuito:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

## Paso 8: Verificar el Despliegue

1. Accede a tu dominio: `https://tu-dominio.com`
2. Verifica que la aplicación carga correctamente
3. Prueba el login de administrador
4. Revisa los logs: `docker-compose logs -f`

## Comandos Útiles

```bash
# Ver estado de los contenedores
docker-compose ps

# Ver logs
docker-compose logs -f [servicio]

# Reiniciar servicios
docker-compose restart

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (CUIDADO: elimina datos)
docker-compose down -v

# Actualizar la aplicación
git pull
docker-compose build
docker-compose up -d

# Hacer backup de la base de datos
docker-compose exec postgres pg_dump -U tu_usuario_db biologia_db > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U tu_usuario_db biologia_db < backup.sql
```

## Solución de Problemas

### Error de conexión a la base de datos

```bash
# Verificar que PostgreSQL está corriendo
docker-compose ps postgres

# Ver logs de PostgreSQL
docker-compose logs postgres

# Verificar conexión
docker-compose exec postgres psql -U tu_usuario_db -d biologia_db
```

### Error 502 Bad Gateway

- Verifica que el backend está corriendo: `docker-compose ps backend`
- Revisa los logs: `docker-compose logs backend`
- Verifica que el puerto 5000 está accesible

### Problemas con permisos

```bash
# Dar permisos al directorio de datos de PostgreSQL
sudo chown -R 999:999 database/postgres_data
```

### Reiniciar todo desde cero

```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Seguridad Adicional

1. **Firewall**: Configura un firewall (UFW) para permitir solo puertos necesarios:
   ```bash
   sudo ufw allow 22/tcp  # SSH
   sudo ufw allow 80/tcp  # HTTP
   sudo ufw allow 443/tcp # HTTPS
   sudo ufw enable
   ```

2. **Backups automáticos**: Configura cron jobs para backups regulares:
   ```bash
   crontab -e
   # Agregar: 0 2 * * * docker-compose exec postgres pg_dump -U usuario db > /backups/db_$(date +\%Y\%m\%d).sql
   ```

3. **Actualizaciones**: Mantén Docker y las imágenes actualizadas:
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

## Notas Importantes

- El frontend está configurado para usar nginx y servir en el puerto 80
- El backend usa gunicorn con 4 workers para mejor rendimiento
- Las credenciales de admin ahora se configuran mediante variables de entorno
- Todos los console.log de desarrollo han sido eliminados
- El modo debug está deshabilitado por defecto

## Soporte

Si encuentras problemas, revisa:
1. Los logs de Docker: `docker-compose logs`
2. Los logs del sistema: `journalctl -u docker`
3. La documentación de Hostinger sobre Docker

