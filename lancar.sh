#!/bin/bash
cd ~/pilula-ana

echo "Nova versao (ex: 3.2.0):"
read VERSAO

echo "{\"versao\":\"$VERSAO\",\"notas\":[\"Login com email e senha\",\"Sistema de dupla com chave\",\"Foto da galeria\",\"Calendario com faltas e pausas\",\"Nome do usuario no header\"]}" > versao.json

git add .
git commit -m "v$VERSAO"
git push https://HarlleyDu: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@github.com/HarlleyDu/pilula-ana.git master

echo "Gerando APK..."
eas build --platform android --profile preview --non-interactive
echo "---"
echo "Buscando link do APK..."
sleep 5
APK_URL=$(eas build:list --platform android --limit 1 --json 2>/dev/null | python3 -c "import sys,json; b=json.load(sys.stdin); print(b[0].get('artifacts',{}).get('buildUrl',''))" 2>/dev/null)

if [ -z "$APK_URL" ]; then
  echo "Cole o link do APK (.apk):"
  read APK_URL
fi

echo "Baixando: $APK_URL"
curl -L -o ~/pilula-ana.apk "$APK_URL"

echo "Publicando no GitHub..."
gh release delete "v$VERSAO" --yes 2>/dev/null
gh release create "v$VERSAO" ~/pilula-ana.apk --title "v$VERSAO" --notes "Versao $VERSAO"

rm ~/pilula-ana.apk
echo ""
echo "Pronto! Versao $VERSAO publicada!"
echo "https://github.com/HarlleyDu/pilula-ana/releases/latest"
