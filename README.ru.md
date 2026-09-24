<div align="center">

<img src="assets/icon-128.png" width="88" alt="Иконка Booking.com Stable Filter Scroll">

# Booking.com Stable Filter Scroll

Убирает раздражающие скачки списка фильтров Booking.com при их применении.

[![Установить с Greasy Fork](https://img.shields.io/badge/Установить-Greasy%20Fork-670000?style=for-the-badge&logo=greasyfork&logoColor=white)](https://greasyfork.org/ru/scripts/596873-booking-com-stable-filter-scroll)
[![Прямая установка](https://img.shields.io/badge/Прямая%20установка-userscript-006CE4?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/booking-stable-filter-scroll.user.js)

[![Greasy Fork version](https://img.shields.io/greasyfork/v/596873?label=версия)](https://greasyfork.org/ru/scripts/596873-booking-com-stable-filter-scroll)
[![Greasy Fork installs](https://img.shields.io/greasyfork/dt/596873?label=установки)](https://greasyfork.org/ru/scripts/596873-booking-com-stable-filter-scroll)
[![Validation](https://github.com/fakie-dev/booking-stable-filter-scroll/actions/workflows/validate.yml/badge.svg?branch=main)](https://github.com/fakie-dev/booking-stable-filter-scroll/actions/workflows/validate.yml)
[![License](https://img.shields.io/github/license/fakie-dev/booking-stable-filter-scroll)](LICENSE)
[![Stars](https://img.shields.io/github/stars/fakie-dev/booking-stable-filter-scroll?style=flat&logo=github)](https://github.com/fakie-dev/booking-stable-filter-scroll/stargazers)

[Установка](#установка) · [Как работает](#как-работает) · [Приватность](#приватность) · [Сообщить об ошибке](https://github.com/fakie-dev/booking-stable-filter-scroll/issues/new?template=bug_report.yml) · [English](README.md)

</div>

<p align="center">
  <img src="assets/readme-banner.png" alt="Превью Booking.com Stable Filter Scroll" width="100%">
</p>

> Неофициальный userscript. Проект не связан с Booking.com и не одобрен компанией.

---

Я сделал этот скрипт после того, как надоело ловить глазами фильтры Booking после каждого клика. Выбираешь пункт, Booking перестраивает список — и место, на которое ты смотрел, уезжает.

Скрипт старается удерживать видимую часть панели фильтров на месте. Он не заменяет интерфейс Booking, не группирует клики и не подделывает состояние чекбоксов.

## Установка

Проще всего поставить через **[Greasy Fork](https://greasyfork.org/ru/scripts/596873-booking-com-stable-filter-scroll)** — там же будет статистика установок и обновления.

Либо напрямую с GitHub:

1. Установи [Tampermonkey](https://www.tampermonkey.net/) или совместимый менеджер userscript'ов.
2. Открой [`booking-stable-filter-scroll.user.js`](https://raw.githubusercontent.com/fakie-dev/booking-stable-filter-scroll/main/booking-stable-filter-scroll.user.js).
3. Проверь код и нажми **Install**.

## Что исправляет

Проблема не всегда сводится к обычному `scrollTo(0, 0)`. Booking может переносить выбранные фильтры, добавлять или удалять строки и перестраивать часть сайдбара. Из-за этого содержимое относительно экрана заметно сдвигается.

Скрипт запоминает несколько видимых строк, не использует только что нажатый фильтр как опорную точку и компенсирует движение остальных строк, пока Booking обновляет интерфейс. Если Booking переносит выбранный пункт в **«Популярные фильтры»**, одинаковые фильтры различаются по их прежней позиции в документе, а не по первому совпадению в DOM.

## Как работает

<details>
<summary>Технические детали</summary>

После нажатия на фильтр скрипт:

- запоминает несколько соседних видимых строк;
- короткое время следит за изменениями DOM;
- измеряет, насколько сдвинулись сохранённые строки;
- компенсирует медианное смещение;
- временно отключает нативный scroll anchoring и конфликтующие программные прокрутки;
- перестаёт вмешиваться сразу, как только ты начинаешь скроллить сам.

При полной навигации данные для восстановления ненадолго сохраняются в `sessionStorage`, после чего удаляются.

Готовый скрипт собирается из модулей; отдельного UI и зависимостей во время работы у него нет.

</details>

## Приватность

| | |
| --- | --- |
| Userscript permissions | `@grant none` |
| Внешние библиотеки | Нет |
| `@require` | Нет |
| Сетевые запросы | Нет |
| Аналитика / телеметрия | Нет |
| Доступ к данным аккаунта | Нет |

Единственное хранилище — короткоживущие данные позиции скролла в `sessionStorage` текущей вкладки.

## Обновления

- Версия с **Greasy Fork** обновляется через Greasy Fork.
- Прямая установка с GitHub использует `@updateURL` и `@downloadURL` этого репозитория.

## Совместимость

Скрипт работает на страницах результатов поиска Booking.com:

```text
https://www.booking.com/searchresults...
```

Booking регулярно меняет фронтенд и проводит A/B-тесты. Если очередная разметка сломает фикс, [создай issue](https://github.com/fakie-dev/booking-stable-filter-scroll/issues/new?template=bug_report.yml) и приложи браузер, версию userscript-менеджера и короткую запись экрана.

## Разработка

Понадобятся Node.js 26 и npm. Файлы в корне — готовые артефакты установки; исходный код находится в `src/`.

```bash
npm ci
npm run build
npm run check
npm test
npm run test:browser
```

`npm run dev` запускает локальный сервер для отладки userscript. `npm run test:browser` проверяет собранный скрипт на тестовой странице в установленном Chrome или Chromium. Подробности есть в [руководстве по разработке](docs/development.md), [описании архитектуры](docs/architecture.md), [плане развития](docs/roadmap.md) и [правилах участия](CONTRIBUTING.md).

## Лицензия

MIT. См. [LICENSE](LICENSE).

Если скрипт оказался полезен — звезда репозиторию поможет другим найти его быстрее.
