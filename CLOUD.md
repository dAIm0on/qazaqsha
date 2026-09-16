# Облако и публикация

Firebase и Cloudflare Pages уже созданы. Живой сайт: https://qazaqsha.pages.dev/

Войди в Firebase тем Google-аккаунтом, которым создавала проект `qazaqsha-f6627`.

## Что уже сделано

- Вход / регистрация по почте и паролю
- Прогресс в облаке после входа
- Chrome и Edge видят один аккаунт, если войти
- Authorized domains: `qazaqsha.pages.dev` и `daim0on.github.io`
- `git push` в `main` обновляет Pages

## Живое сейчас

Workers AI binding: переменная **`AI`**. Redeploy после изменения binding.

Rate limit объявлен в `wrangler.toml` (`TUTOR_RATE`, 25/мин). На Pages этот binding может не появиться в таблице — это не ломает сайт.

## Не трогать в этом файле

Пароль от Google в чат не писать. Почту владельца в репозиторий не класть.
