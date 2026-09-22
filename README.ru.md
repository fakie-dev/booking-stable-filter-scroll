<div align="center">

# Booking.com Stable Filter Scroll

Не даёт панели фильтров Booking.com прыгать во время обновления результатов.

[![Установить userscript](https://img.shields.io/badge/Установить-userscript-006CE4?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/booking-stable-filter-scroll.user.js)

[![Release](https://img.shields.io/github/v/release/fakie-dev/booking-stable-filter-scroll?display_name=tag&sort=semver)](https://github.com/fakie-dev/booking-stable-filter-scroll/releases/latest)
[![Validation](https://github.com/fakie-dev/booking-stable-filter-scroll/actions/workflows/validate.yml/badge.svg?branch=main)](https://github.com/fakie-dev/booking-stable-filter-scroll/actions/workflows/validate.yml)
[![License](https://img.shields.io/github/license/fakie-dev/booking-stable-filter-scroll)](LICENSE)
[![Stars](https://img.shields.io/github/stars/fakie-dev/booking-stable-filter-scroll?style=flat&logo=github)](https://github.com/fakie-dev/booking-stable-filter-scroll/stargazers)
[![Open issues](https://img.shields.io/github/issues/fakie-dev/booking-stable-filter-scroll)](https://github.com/fakie-dev/booking-stable-filter-scroll/issues)
[![Last commit](https://img.shields.io/github/last-commit/fakie-dev/booking-stable-filter-scroll)](https://github.com/fakie-dev/booking-stable-filter-scroll/commits/main)

[Установка](#установка) · [Как это работает](#как-это-работает) · [Приватность](#приватность) · [Сообщить об ошибке](https://github.com/fakie-dev/booking-stable-filter-scroll/issues/new?template=bug_report.yml) · [English](README.md)

</div>

---

Я сделал этот скрипт после того, как меня окончательно достала панель фильтров Booking.com. Выбираешь очередной пункт, Booking перестраивает список — и место, на котором ты только что был, уезжает.

Скрипт удерживает текущую область фильтров примерно на том же месте экрана, пока Booking обновляет страницу. Он не подменяет чекбоксы, не собирает фильтры пачкой и вообще не меняет их штатную логику.

## Установка

1. Установите [Tampermonkey](https://www.tampermonkey.net/) или другой совместимый userscript-менеджер.
2. Откройте **[booking-stable-filter-scroll.user.js](https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/booking-stable-filter-scroll.user.js)**.
3. Посмотрите исходник и нажмите **Install / Установить**.

После этого просто откройте результаты поиска Booking.com и пользуйтесь фильтрами как обычно.

## Что именно исправляет скрипт

Проблема не всегда сводится к `scrollTo(0, 0)`. Booking может перенести выбранный фильтр выше, удалить или добавить строки либо заново отрисовать часть панели. Из-за этого меняется высота контента выше текущего места и viewport визуально съезжает.

Скрипт запоминает несколько видимых строк рядом с текущей областью и компенсирует их смещение во время обновления. Нажатый фильтр специально не используется как ориентир — его Booking как раз может переставить.

## Как это работает

<details>
<summary>Технические детали</summary>

При нажатии на фильтр скрипт:

- запоминает несколько соседних видимых строк;
- короткое время следит за изменениями DOM;
- измеряет, насколько сдвинулись сохранённые строки;
- компенсирует медианное смещение прокруткой страницы;
- на время обновления отключает нативный scroll anchoring и конфликтующую программную прокрутку;
- сразу перестаёт вмешиваться, если вы начинаете скроллить сами.

При полноценном переходе данные для восстановления ненадолго сохраняются в `sessionStorage` текущей вкладки.

Никакой дополнительной панели или настроек скрипт не добавляет.

</details>

## Приватность

Здесь всё максимально просто:

| | |
| --- | --- |
| Права userscript | `@grant none` |
| Внешние библиотеки | Нет |
| `@require` | Нет |
| Сетевые запросы | Нет |
| Аналитика / телеметрия | Нет |
| Доступ к данным аккаунта | Нет |

В `sessionStorage` текущей вкладки ненадолго хранится только техническая информация, необходимая для восстановления позиции страницы.

## Автообновление

Tampermonkey проверяет маленький файл [`booking-stable-filter-scroll.meta.js`](booking-stable-filter-scroll.meta.js) и сравнивает `@version` с установленной версией. Если вышла новая, основной `.user.js` загружается из этого репозитория.

То есть после первой установки вручную переустанавливать скрипт для каждого релиза не нужно. Частота проверок и автоматическая установка зависят от настроек Tampermonkey.

## Совместимость

Скрипт рассчитан на страницы результатов поиска:

```text
https://www.booking.com/searchresults...
```

Booking регулярно меняет и A/B-тестирует интерфейс, поэтому когда-нибудь разметка может поменяться достаточно сильно, чтобы понадобился фикс. Если такое произошло — [создайте issue](https://github.com/fakie-dev/booking-stable-filter-scroll/issues/new?template=bug_report.yml). Желательно указать браузер, версию userscript-менеджера и приложить короткую запись экрана.

## Разработка

Зависимостей и сборки нет.

```bash
git clone https://github.com/fakie-dev/booking-stable-filter-scroll.git
cd booking-stable-filter-scroll
node --check booking-stable-filter-scroll.user.js
node scripts/validate.mjs
```

Для смены версии сразу в `.user.js` и `.meta.js`:

```bash
node scripts/set-version.mjs 1.0.1
```

Остальные правила — в [CONTRIBUTING.md](CONTRIBUTING.md).

## Лицензия

MIT. См. [LICENSE](LICENSE).

Если скрипт пригодился, ⭐ репозиторию поможет другим людям быстрее найти этот фикс.
