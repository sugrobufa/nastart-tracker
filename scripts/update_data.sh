#!/bin/bash
# Скрипт обновления данных НАСТАРТ Трекера
# Запускает парсинг PDF и дедупликацию, обновляет data.json
#
# Использование:
#   ./scripts/update_data.sh
#
# Предварительно установите зависимости:
#   pip install pdfplumber PyMuPDF

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== НАСТАРТ Трекер: обновление данных ==="
echo "Repo: $REPO_DIR"
echo ""

# Step 1: Parse PDFs
echo "--- Шаг 1: Парсинг PDF протоколов ---"
python3 "$SCRIPT_DIR/parse_pdfs.py"
echo ""

# Step 2: Deduplicate and build data.json
echo "--- Шаг 2: Дедупликация и сборка data.json ---"
python3 "$SCRIPT_DIR/deduplicate.py"
echo ""

# Show result
DATA_FILE="$REPO_DIR/data.json"
if [ -f "$DATA_FILE" ]; then
    SIZE=$(du -h "$DATA_FILE" | cut -f1)
    ATHLETES=$(python3 -c "import json; d=json.load(open('$DATA_FILE')); print(len(d))")
    RESULTS=$(python3 -c "import json; d=json.load(open('$DATA_FILE')); print(sum(len(a['results']) for a in d))")
    echo "=== Готово ==="
    echo "Файл: $DATA_FILE ($SIZE)"
    echo "Спортсменов: $ATHLETES"
    echo "Результатов: $RESULTS"
else
    echo "ОШИБКА: data.json не создан!"
    exit 1
fi
