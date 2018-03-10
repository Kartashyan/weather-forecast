//creating state management

const store = {
    forecastData: {},
    selectedDay: 0,
    selectedCity: "Paris",
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
                console.log("optionsList: ", value);
                Helpers.renderOptionsData(value);
                break;
            case "selectedCity":
                console.log("optionsList: ", value);
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
        if (e.target.className === "day") {
            observableStore.selectedDay = e.target.childNodes[0].innerText
        } else {
            observableStore.selectedDay = e.target.parentNode.childNodes[0].innerText
        }
    }

    get dayDom() {
        const weekDayText = document.createTextNode(this.weekDay);
        const weatherDataText = document.createTextNode(this.weatherData);

        const weekDayElement = document.createElement("div");
        weekDayElement.appendChild(weekDayText);

        const weatherDataElement = document.createElement("div");
        weatherDataElement.appendChild(weatherDataText);

        const dayElement = document.createElement("div");

        dayElement.setAttribute("class", "day");
        dayElement.appendChild(weekDayElement);
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
    constructor(data) {
        this.data = data;
    }

    get detailDOM() {
        const fragment = document.createDocumentFragment();
        Object.entries(this.data).forEach(element => {
            const itemDetail = new ItemDetail(element[0], element[1]);
            fragment.appendChild(itemDetail.itemDetailDom)
        });
        return fragment;
    }
}

class ItemDetail {
    constructor(name, value) {
        this.name = name;
        this.value = value;
    }

    get itemDetailDom() {
        const nameElement = document.createElement("div");
        const nameText = document.createTextNode(this.name);
        nameElement.appendChild(nameText);

        const valueElement = document.createElement("div");
        const valueText = document.createTextNode(this.value);
        valueElement.appendChild(valueText);

        const detailRow = document.createElement("div");
        detailRow.setAttribute("class", "detail_weather_row")
        detailRow.appendChild(nameElement);
        detailRow.appendChild(valueElement);


        return detailRow;
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

//Helpers API

class Helpers {
    static fetchToRender(city) {
        const yahooAPI = `https://cors-anywhere.herokuapp.com/https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20weather.forecast%20where%20woeid%20in%20(select%20woeid%20from%20geo.places(1)%20where%20text%3D%22${city}%2C%20ak%22)&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys`
        fetch(yahooAPI, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            }
        }).then(res => res.json()).then(json => {
            observableStore.forecastData = json;
            console.log(json)
        });
    }

    static fetchCities(term) {
        fetch(`https://cors-anywhere.herokuapp.com/https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${term}&types=(cities)&key=AIzaSyAT870FbSjbVMN4pnAc28DbZDVEMlgxtSo`)
            .then(res => res.json())
            .then(json => {
                // console.log(json);
                observableStore.optionsList = json.predictions.map(el => el.description)
            })
    }

    static renderFatchedData(json) {
        const upcomingDaysFragment = new UpcomingDays(json.query.results.channel.item.forecast);

        const daysElement = document.getElementById("days");
        daysElement.innerHTML = "";

        daysElement.appendChild(upcomingDaysFragment.upcomingDaysDom);

        const detailDataFragment = new DetailWeather(json.query.results.channel.item.forecast[0]);

        const detailDataElement = document.getElementById("detail_data");
        detailDataElement.innerHTML = "";
        detailDataElement.appendChild(detailDataFragment.detailDOM);
    }
    static reRenderDetailData(json, selectedDay) {
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
}


window.onload = function () {
    const citiesInput = document.getElementById("cities_input");
    citiesInput.addEventListener("keyup", event => {

        Helpers.fetchCities(event.target.value);

    });
    citiesInput.addEventListener("change", event => {
        observableStore.selectedCity = event.target.value;
    });
    // const apiForCity = weatherAPIForCity(city);
    Helpers.fetchToRender(observableStore.selectedCity.toLowerCase());

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const pos = {
                lat: +position.coords.latitude,
                lng: +position.coords.longitude
            };
            let coordString = pos.lat.toFixed(3) + "," + pos.lng.toFixed(3);
            console.log(coordString);
            fetch(`https://cors-anywhere.herokuapp.com/https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordString}&key=AIzaSyAT870FbSjbVMN4pnAc28DbZDVEMlgxtSo`)
                .then(res => res.json())
                .then(json => {
                    console.log("Geolocation", json);
                    const city = json.results[4].formatted_address;
                    observableStore.selectedCity = city;
                    document.getElementById("cities_input").value = city;
                });
        })
    }
}