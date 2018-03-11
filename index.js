//creating state management

const store = {
    forecastData: {},
    selectedDay: 0,
    selectedCity: "Yerevan",
    optionsList: []
}

const handler = {
    set(target, key, value) {
        switch (key) {
            case "forecastData":
                Helpers.renderFatchedData(value);
                break;
            case "selectedDay":
                Helpers.reRenderDetailData(target.forecastData, value);
                break;
            case "optionsList":
                Helpers.renderOptionsData(value);
                break;
            case "selectedCity":
                Helpers.fetchToRender(value.toLowerCase());
                break;
            default:
                break;
        }
        target[key] = value;
        return true;
    },
};

const observableStore = new Proxy(store, handler);

// components for creating UI

class DayComponent {
    constructor(weekDay, weatherData) {
        this.weekDay = weekDay;
        this.weatherData = weatherData;
    }

    onClick(e) {
        let dayNode;

        if (e.target.className === "day") {
            dayNode = e.target;
        } else {
            dayNode = e.target.parentNode;
        }

        observableStore.selectedDay = dayNode.dataset.id;
    }

    get dayDom() {
        const dayElement = document.createElement("div");
        dayElement.setAttribute("data-id", this.weekDay);

        const weatherDataElement = document.createElement("div");
        const weatherDataText = document.createTextNode(this.weatherData);
        weatherDataElement.appendChild(weatherDataText);


        dayElement.setAttribute("class", "day");
        dayElement.appendChild(weatherDataElement);
        dayElement.addEventListener("click", this.onClick);

        return dayElement;
    }
}

class UpcomingDays {
    constructor(data) {
        this.data = data;
    }
    get upcomingDaysDom() {
        const fragment = document.createDocumentFragment();
        this.data.forEach((element, index) => {
            const day = new DayComponent(index, element.day);
            fragment.appendChild(day.dayDom)
        });
        return fragment;
    }
}

class DetailWeather {
    constructor(data, selectedDay) {
        this.data = data;
    }

    get detailDOM() {
        const fragment = document.createDocumentFragment();

        const condition = new WeatherElement('condition', this.data.text);
        fragment.appendChild(condition.node);

        const forecastTemperature = new WeatherElement('forecast-temperature-container');

        const lowTemperature = new WeatherElement('forecast-temperature low-temperature', this.data.low);
        forecastTemperature.node.appendChild(lowTemperature.node);

        const highTemperature = new WeatherElement('forecast-temperature high-temperature', this.data.high);
        forecastTemperature.node.appendChild(highTemperature.node);

        fragment.appendChild(forecastTemperature.node);

        return fragment;
    }
}

class Options {
    constructor(cities) {
        this.cities = cities;
    }
    get optionsFragment() {
        const fragment = document.createDocumentFragment();

        this.cities.forEach(city => {
            const option = document.createElement("option");
            option.setAttribute("value", city);
            fragment.appendChild(option);
        });

        return fragment;
    }
}

class WeatherElement {
    constructor(className, text) {
        this.className = className;
        this.text = text;

        this.node = this.createNode();
    }

    createNode() {
        const element = document.createElement("div");
        element.className = this.className;

        if (this.text) {
            const elementText = document.createTextNode(this.text);
            element.appendChild(elementText);
        }

        return element;
    }
}

//Helpers

class Helpers {
    static fetchToRender(city) {
        const requestQuery = `select * from weather.forecast where woeid in (select woeid from geo.places(1) where text = '${city}, ak') and u = 'c'`;
        const yahooAPI = `https://cors-anywhere.herokuapp.com/https://query.yahooapis.com/v1/public/yql?q=${requestQuery}&format=json&env=store://datatables.org/alltableswithkeys`
        fetch(yahooAPI, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            }
        }).then(res => res.json()).then(json => {
            observableStore.forecastData = json;
        });
    }

    static fetchCities(term) {
        fetch(`https://cors-anywhere.herokuapp.com/https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${term}&types=(cities)&key=AIzaSyAT870FbSjbVMN4pnAc28DbZDVEMlgxtSo`)
            .then(res => res.json())
            .then(json => {
                observableStore.optionsList = json.predictions.map(el => el.description)
            })
    }

    static renderFatchedData(json) {
        const upcomingDaysFragment = new UpcomingDays(json.query.results.channel.item.forecast);

        const daysElement = document.getElementById("days");
        daysElement.innerHTML = "";

        daysElement.appendChild(upcomingDaysFragment.upcomingDaysDom);

        Helpers.reRenderDetailData(json, 0);
    }

    static reRenderDetailData(json, selectedDay) {
        Helpers.setSelectedDay(selectedDay);

        const detailDataFragment = new DetailWeather(json.query.results.channel.item.forecast[selectedDay]);

        const detailDataElement = document.getElementById("detail_data");
        detailDataElement.innerHTML = "";
        detailDataElement.appendChild(detailDataFragment.detailDOM);
    }

    static renderOptionsData(optionsList) {
        const options = new Options(optionsList);
        const optionsFragment = options.optionsFragment;
        const dataList = document.getElementById("cities");
        dataList.innerHTML = "";
        dataList.appendChild(optionsFragment)
    }

    static setSelectedDay(index) {
        const days = document.querySelector('#days');

        const selectedDay = days.querySelector('.selected');

        if (selectedDay) {
            selectedDay.classList.remove('selected');
        }

        days.children[index] && days.children[index].classList.add('selected');
    }
}


window.onload = function () {
    const citiesInput = document.getElementById("cities_input");
    citiesInput.addEventListener("keyup", event => {

        Helpers.fetchCities(event.target.value);

    });

    citiesInput.addEventListener("change", event => {

        observableStore.selectedCity = event.target.value;

    });

    Helpers.fetchToRender(observableStore.selectedCity.toLowerCase());

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const pos = {
                lat: +position.coords.latitude,
                lng: +position.coords.longitude
            };

            let coordString = pos.lat.toFixed(3) + "," + pos.lng.toFixed(3);

            fetch(`https://cors-anywhere.herokuapp.com/https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordString}&key=AIzaSyAT870FbSjbVMN4pnAc28DbZDVEMlgxtSo`)
                .then(res => res.json())
                .then(json => {
                    const city = json.results[3].formatted_address;
                    observableStore.selectedCity = city;
                    document.getElementById("cities_input").value = city;
                });
        })
    }
}
