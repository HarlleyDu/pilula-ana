#!/bin/bash
cd ~/pilula-ana

echo "Nova versao (ex: 3.1.0):"
read VERSAO

echo "{\"versao\":\"$VERSAO\",\"notas\":[\"Login com email e senha\",\"Sistema de dupla com chave\",\"Foto da galeria\",\"Calendario com faltas e pausas\",\"Nome do usuario no header\"]}" > versao.json

git add .
git commit -m "v$VERSAO"
git push https://HarlleyDu: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@github.com/HarlleyDu/pilula-ana.git master

eas build --platform android --profile preview --non-interactive 2>&1 | tee /tmp/build.log

APK_LINK=$(grep -o 'https://expo.dev/artifacts/eas/[^ ]*\.apk' /tmp/build.log | tail -1)

if [ -z "$APK_LINK" ]; then
  echo "Cole o link do APK:"
  read APK_LINK
fi

curl -L -o /tmp/pilula-ana.apk "$APK_LINK"
gh release delete "v$VERSAO" --yes 2>/dev/null
gh release create "v$VERSAO" /tmp/pilula-ana.apk --title "v$VERSAO" --notes "Versao $VERSAO"

echo "Pronto! https://github.com/HarlleyDu/pilula-ana/releases/latest"
rm /tmp/pilula-ana.apk
