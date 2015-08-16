/**
 * Реализация API, не изменяйте ее
 * @param {string} url
 * @param {function} callback
 */
function getData(url, callback) {
    var RESPONSES = {
        '/countries': [
            {name: 'Cameroon', continent: 'Africa'},
            {name: 'Fiji Islands', continent: 'Oceania'},
            {name: 'Guatemala', continent: 'North America'},
            {name: 'Japan', continent: 'Asia'},
            {name: 'Yugoslavia', continent: 'Europe'},
            {name: 'Tanzania', continent: 'Africa'}
        ],
        '/cities': [
            {name: 'Bamenda', country: 'Cameroon'},
            {name: 'Suva', country: 'Fiji Islands'},
            {name: 'Quetzaltenango', country: 'Guatemala'},
            {name: 'Osaka', country: 'Japan'},
            {name: 'Subotica', country: 'Yugoslavia'},
            {name: 'Zanzibar', country: 'Tanzania'},
        ],
        '/populations': [
            {count: 138000, name: 'Bamenda'},
            {count: 77366, name: 'Suva'},
            {count: 90801, name: 'Quetzaltenango'},
            {count: 2595674, name: 'Osaka'},
            {count: 100386, name: 'Subotica'},
            {count: 157634, name: 'Zanzibar'}
        ]
    };

    setTimeout(function () {
        var result = RESPONSES[url];
        if (!result) {
            return callback('Unknown url');
        }

        callback(null, result);
    }, Math.round(Math.random * 1000));
}

/**
 * Ваши изменения ниже
 */

/*
 *  Скрипт имеет несколько проблем:
 *
 *  1) В функции `callback` отсутствует переменная `request`.
 *     Когда функция вызывается, она берёт это переменную из внешнего LexicalEnvironment.
 *
 *    На момент выполнения передаваемого в getData() коллбэка внешний цикл уже завершился.
 *    => последнее значение переменной response == '/populations'.
 *    В результате все переданные в `getData()` коллбэки будут использовать одно и то же
 *    значение response ( == '/populations'), поэтому результат выполнения отличается от ожидаемого.
 *
 *    Исправить код можно, "поймав" текущее значение `response` с помощью дополнительной внешней функции
 *    (в ней `response` является аргументом).
 *    В своей реализации я назвал эту функцию `callbackGenerator`.
 *
 *
 *    Остальные ошибки и неточности не влияют на выполнение исходного кода,
 *    но их всё равно желательно исправить.
 *
 *  2) Если использовать переменную без объявления через `var`,
 *    она попадет в глобальную область видимости (добавляется свойством в объект window/global/etc.)
 *    или выдаст ReferenceError в "strict mode".
 *
 *  3) Нет обработки переданной в коллбэк ошибки ( `function (error, result) { ... }` ).
 *
 *  4) В функции `getData()` при вызове `setTimeout()` вторым параметром передается `NaN`.
 *     Исправить можно добавив скобки функции `Math.random()`.
 *
 *  5) Неинтуитивные имена переменных, магические цифры, большая вложенность, именование констант lowercase,
 *     отсутствие декомпозиции.
 */

/**
 * Поисковик популяций.
 *
 * @param options
 * @constructor
 */
function PopulationSearcher(options) {
    options || (options = {});

    if (!options.fetch) {
        throw new Error('Необходимо установить функцию, реализующую API');
    }

    // "Пробрасываем" зависимость getData в объект
    this.fetch = options.fetch;
    this._initialize();

    this._getRequest();
}

/**
 * Инициализирует начальные значения объекта.
 *
 * @private
 */
PopulationSearcher.prototype._initialize = function () {
    // Адреса для запросов могут изменяться, поэтому оставляем публичным
    this.REQUESTS = ['/countries', '/cities', '/populations'];
    this._responses = {};
};

/**
 * Словарь для фраз.
 */
PopulationSearcher.prototype.messages = {
    question: 'Введите название страны или города',
    answerFail: 'Название страны или города является обязательным! Продолжить?',
    defaultAnswer: 'Africa',
    requestFail: 'На данной территории нет людей!'
};

/**
 * Выполняет асинхронные запросы к API
 * с целью получения ответа на запрос пользователя.
 *
 * @private
 */
PopulationSearcher.prototype._getPopulation = function () {
    var self = this;
    this.REQUESTS.forEach(function (request) {
        getData(request, self._callbackGenerator(request));
    });
};

/**
 * Выполняет запрос поиска количества человек.
 *
 * @private
 */
PopulationSearcher.prototype._getRequest = function () {
    var query = prompt(this.messages.question, this.messages.defaultAnswer);
    if (!query) {
        var needToReturn = confirm(this.messages.answerFail);
        return (needToReturn) ? this._getRequest() : '';
    }

    this._query = query;
    this._getPopulation();
};

/**
 * Возвращает, готов ли ответ на запрос пользователя.
 *
 * @returns {*|boolean} true, если ответ готов, false - иначе
 * @private
 */
PopulationSearcher.prototype._responseIsReady = function () {
    var responsesLength = Object.keys(this._responses).length;
    return responsesLength === this.REQUESTS.length;
};

/**
 * Постепенно проводит запрос через город - страну - континент.
 * Если на одном из этапов что-то нашлось, выдаёт это значение, иначе 0.
 *
 * @param {string} query Запрос на поиск
 * @returns {*|number} Количество человек, проживающих на запрашиваемой территории.
 * @private
 */
PopulationSearcher.prototype._getPopulationByQuery = function (query) {
    return this._getCityPopulation(query) ||
        this._getCountryPopulation(query) ||
        this._getContinentPopulation(query) ||
        0;
};

/**
 * Возвращает коллбек, выполняемый после получения данных от API.
 *
 * @param {string} request
 * @returns {Function}
 * @private
 */
PopulationSearcher.prototype._callbackGenerator = function (request) {
    var self = this;

    return function (error, result) {
        if (error) throw new Error(error);

        var responses = self._responses;
        responses[request] = result;

        // Ждём пока все данные будут получены.
        if (!self._responseIsReady()) return;

        var totalPopulation = self._getPopulationByQuery(self._query);
        if (!totalPopulation) {
            // Мощь русский языка помогает не проводить проверку на города без жителей!
            console.log(self.messages.requestFail);
            return alert(self.messages.requestFail);
        }

        // Было бы хорошо вынести фразу в общий список.
        var message = 'На данной площади (' + self._query + ') проживает: ' + totalPopulation + ' чел.';
        alert(message);
        console.log(message);
    };
};

/**
 * Возвращает количество человек, проживающих в {@code target}
 *
 * @param {string} target Территория, на которой пытаемся посчитать популяцию
 * @param {string} response Где искать популяцию
 * @param filterField По какому полю фильтровать популяцию
 * @param getPopulationFunc Какую функцию вызвать дальше, если популяция составная
 * Например, Континент состоит из Стран, а страны состоят из городов.
 * @returns {number} Количество человек, проживающих на территории.
 * @private
 */
PopulationSearcher.prototype._getAreaPopulation = function (target, response, filterField, getPopulationFunc) {
    var self = this;
    var area = this._responses[response];
    var targetArea = area.filter(function (area) {
        return area[filterField] === target;
    });

    if (!targetArea.length) {
        return 0;
    }

    function bind(func, context) {
        return function() {
            return func.apply(context, arguments);
        };
    }

    getPopulationFunc = bind(getPopulationFunc, self);
    return targetArea.reduce(function (sumPopulation, area) {
        return sumPopulation + getPopulationFunc(area.name);
    }, 0);
};

/**
 * Возвращает количество человек, проживающих в {@code city}
 *
 * @param {string} city Город, в котором пытаемся посчитать популяцию
 * @returns {number} Количество человек, проживающих в городе.
 * @private
 */
PopulationSearcher.prototype._getCityPopulation = function (city) {
    var populations = this._responses['/populations'];
    var targetCity = populations.filter(function (population) {
        return population.name === city;
    });

    return (targetCity.length) ? targetCity[0].count : 0;
};

/**
 * Возращает количество человек, проживающих в {@code country}
 *
 * @param country Страна, в которой пытаемся посчитать популяцию
 * @returns {number}  Количество человек, проживающих в стране.
 * @private
 */
PopulationSearcher.prototype._getCountryPopulation = function (country) {
    return this._getAreaPopulation(country, '/cities', 'country', this._getCityPopulation);
};

/**
 * Возращает количество человек, проживающих на {@code continent}
 *
 * @param {string} continent Континент, в которой пытаемся найти количество человек
 * @returns {number}  Количество человек, проживающих на континенте.
 * @private
 */
PopulationSearcher.prototype._getContinentPopulation = function (continent) {
    return this._getAreaPopulation(continent, '/countries', 'continent', this._getCountryPopulation);
};


/* ----- */

new PopulationSearcher({
    fetch: getData
});
