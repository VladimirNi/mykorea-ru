#!/bin/bash

# --- Настройки для сайта mykorea.ru ---
USER="mykorea_ru_usr"
SERVER="31.129.46.17"
PATH_SITE="/var/www/mykorea_ru_usr/data/www/mykorea.ru/"
ARCHIVE_NAME="public.tar.gz"

echo ">>> 1. Сборка сайта Hugo (Blonde theme) и архивация (Локально)..."
hugo --minify

# Создаем Gzip-архив из папки public
tar -czf ${ARCHIVE_NAME} public

echo ">>> 2. Выгрузка архива на сервер..."
# Копируем архив. Если ключи не настроены, здесь спросят пароль.
scp ${ARCHIVE_NAME} ${USER}@${SERVER}:${PATH_SITE}

echo ">>> 3. Распаковка и настройка прав (На Сервере)..."
# Подключаемся по SSH для распаковки.
ssh ${USER}@${SERVER} "
    cd ${PATH_SITE} || exit;
    
    # Распаковываем, перезаписываем, убираем папку 'public/' из пути
    tar -xzf ${ARCHIVE_NAME} --overwrite --strip-components 1;
    
    # Удаляем архив с сервера
    rm ${ARCHIVE_NAME};
    
    # Права доступа (стандарт для веб-серверов)
    find . -type d -exec chmod 755 {} \; && find . -type f -exec chmod 644 {} \;"

echo ">>> 4. Локальная очистка..."
rm ${ARCHIVE_NAME}

echo "✅ Деплой сайта mykorea.ru завершен!"