# Облако тренажёра — 10 минут, когда вернёшься

Код уже в репозитории. Осталось создать бесплатный проект Firebase и вставить конфиг. Пароль от Google в чат не нужен: войди сама в браузере.

## 1. Firebase (вход и прогресс)

1. Открой https://console.firebase.google.com под `kristina.starykh@gmail.com`
2. Add project → имя `qazaqsha` → отключи Google Analytics если спросит
3. Build → Authentication → Get started → Email/Password → Enable → Save
4. Build → Firestore Database → Create → start in **production** mode → location `eur3` (или europe-west)
5. Firestore → Rules → вставь содержимое файла `firestore.rules` из репозитория → Publish
6. Шестерёнка проекта → Project settings → Your apps → Web `</>` → ник `qazaqsha` → скопируй объект `firebaseConfig`

В репозитории открой `firebase-config.js` и замени на:

```js
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Authentication → Settings → Authorized domains → добавь:
- `daim0on.github.io`
- позже домен Cloudflare `*.pages.dev`

Напиши мне «конфиг вставила» — проверю вход.

## 2. Cloudflare Pages (автообновления)

1. https://dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git
2. Репозиторий `dAIm0on/qazaqsha`
3. Framework preset: None. Build command пустой. Output directory: `/`
4. Save and Deploy

После этого каждый `git push` в `main` обновляет сайт у всех за 1–2 минуты. Старый GitHub Pages можно оставить как запасной.

## 3. Что уже сделано без тебя

- Кнопки Войти / Регистрация (почта + пароль)
- Прогресс пишется в облако после входа
- Chrome и Edge видят один аккаунт
- Старый прогресс из браузера подтягивается в аккаунт при первой регистрации
