#!/bin/bash
cd ~/pilula-ana

TOKEN=$(cat ~/.github_token)

# Versao automatica
ATUAL=$(cat versao.json | python3 -c "import sys,json; print(json.load(sys.stdin)['versao'])")
MAJOR=$(echo $ATUAL | cut -d. -f1)
MINOR=$(echo $ATUAL | cut -d. -f2)
PATCH=$(echo $ATUAL | cut -d. -f3)
PATCH=$((PATCH+1))
VERSAO="$MAJOR.$MINOR.$PATCH"

echo "Lancando versao $VERSAO automaticamente..."

echo "{\"versao\":\"$VERSAO\",\"notas\":[\"Login com email e senha\",\"Sistema de dupla com chave\",\"Foto da galeria\",\"Calendario com faltas e pausas\",\"Nome do usuario no header\"]}" > versao.json

git add versao.json assets/
git commit -m "v$VERSAO"
git push https://HarlleyDu:$TOKEN@github.com/HarlleyDu/pilula-ana.git master

echo "Gerando APK..."
eas build --platform android --profile preview --non-interactive

APK_URL=$(eas build:list --platform android --limit 1 --json 2>/dev/null | python3 -c "import sys,json; b=json.load(sys.stdin); print(b[0].get('artifacts',{}).get('buildUrl',''))" 2>/dev/null)

if [ -z "$APK_URL" ]; then
  echo "Cole o link do APK:"
  read APK_URL
fi

echo "Baixando APK..."
curl -L -o ~/pilula-ana.apk "$APK_URL"

echo "Publicando no GitHub..."
GITHUB_TOKEN=$TOKEN gh release delete "v$VERSAO" --yes 2>/dev/null
GITHUB_TOKEN=$TOKEN gh release create "v$VERSAO" ~/pilula-ana.apk --title "v$VERSAO" --notes "Versao $VERSAO" --repo HarlleyDu/pilula-ana

rm ~/pilula-ana.apk
echo ""
echo "Pronto! Versao $VERSAO publicada!"
echo "https://github.com/HarlleyDu/pilula-ana/releases/latest"
