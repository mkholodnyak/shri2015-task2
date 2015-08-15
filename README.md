Демо
---

[http://kholodnyak.ru/shri/africa-population](http://kholodnyak.ru/shri/africa-population)

Описание ошибок
---

 Скрипт имеет несколько проблем:
 
*  ___Проблема:___ 
   В функции `callback` отсутствует переменная `request`.
   Когда функция вызывается, она берёт это переменную из внешнего LexicalEnvironment.
   На момент выполнения передаваемого в `getData()` коллбэка внешний цикл уже завершился  => последнее значение переменной `response == '/populations'`. В результате все переданные в `getData()` коллбэки будут использовать одно и то же
   значение response ( `== '/populations'`), поэтому результат выполнения отличается от ожидаемого.

    ___Решение:___ 
    Исправить код можно, "поймав" текущее значение `response` с помощью дополнительной внешней функции
    (в ней `response` является аргументом).
    В своей реализации я назвал эту функцию `callbackGenerator`.

    ```javascript
    var callback = (function (request) {
        // Далее идёт изначальный код из условия.
        return function (error, result) {
            responses[request] = result;
            ...
        };
    })(request);
    ```

    Остальные ошибки и неточности не влияют на выполнение исходного кода,
    но их всё равно желательно исправить.

* 
    Если использовать переменную без объявления через `var`,
    она попадет в глобальную область видимости (добавляется свойством в объект `window`/`global`/etc.)
    или выдаст ReferenceError в `strict mode`.
    Необходимо всегда объявлять переменные с помощью `var`/`let` (ES6)
*  Нет обработки переданной в коллбэк ошибки.

    ```javascript
    function (error, result) { ... }
    ```
   
*  В функции `getData()` при вызове `setTimeout()` вторым параметром передается `NaN`.
    Исправить можно, добавив скобки функции `Math.random()`.
*  Неинтуитивные имена переменных, магические цифры, большая вложенность, именование констант lowercase, отсутствие декомпозиции.