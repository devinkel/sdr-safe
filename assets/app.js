function initMap() {

    // Create map object and set initial configuration
    const map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: -26.3051, lng: -48.8461 },
        zoom: 13,
        styles: [
            {
                featureType: "landscape",
                elementType: "geometry.fill",
                stylers: [{ color: "#907ee2" }, { lightness: 70 }]
            },
        ]
    });

    // Creating the search field with autocomplete
    const input = document.getElementById("pac-input");
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo("bounds", map);
    autocomplete.setFields(["address_components", "geometry", "name", "place_id"]);
    const infowindow = new google.maps.InfoWindow();
    const infowindowContent = document.getElementById(
        "infowindow-content"
    );
    infowindow.setContent(infowindowContent);
    const marker = new google.maps.Marker({
        map,
        anchorPoint: new google.maps.Point(0, -29),
    });

    // Adds a listener for when the user selected location changes
    const downloadButton = document.getElementById("download-csv");
    let downloadListener = null;
    autocomplete.addListener("place_changed", () => {

        // Clears the info window and hides the previous bookmark
        infowindow.close();
        marker.setVisible(false);

        // Gets the details of the place selected by the user
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            window.alert("Nenhum resultado encontrado para esta pesquisa");
            return;
        }

        // Zoom in on the map to the selected location
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(17);
        }

        // Places a marker at the selected location
        marker.setPosition(place.geometry.location);

        // Search for nearby places that are of type "Textile Industry
        marker.setVisible(true);
        let request = {
            location: place.geometry.location,
            radius: "10000",
            query: "Indústria Têxtil",
        };
        const service = new google.maps.places.PlacesService(map);
        service.textSearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                let stores = [];
                results.forEach(result => {

                    // For each place found, search for more details
                    const request = {
                        placeId: result.place_id,
                        fields: ["name", "formatted_address", "formatted_phone_number", "website"],
                    };
                    const service = new google.maps.places.PlacesService(map);
                    service.getDetails(request, (placeDetails, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK) {
                            if (downloadListener) {
                                downloadButton.removeEventListener("click", downloadListener);
                            }

                            // Adds the found location to the list of stores
                            let store = {
                                name: placeDetails.name,
                                address: placeDetails.formatted_address,
                                phone: placeDetails.formatted_phone_number || "",
                                website: placeDetails.website || ""
                            };
                            stores.push(store);
                            createMarker(result);
                        }

                        // If all the details of all the stores have already been fetched, creates the CSV file download listener
                        if (stores.length === results.length) {
                            downloadListener = () => {
                                generateCSV(stores, place.name);
                            };
                            downloadButton.addEventListener("click", downloadListener);
                        }
                    });
                });
                map.setCenter(results[0].geometry.location);
            }
        });

    });

    function createMarker(place) {
        const marker = new google.maps.Marker({
            map,
            position: place.geometry.location,
        });
        google.maps.event.addListener(marker, "click", () => {
             // Create a request object with the place's ID and the fields we want to retrieve.
            const request = {
                placeId: place.place_id,
                fields: ["name", "formatted_address", "formatted_phone_number", "website"],
            };

            // Create a new PlacesService object and send a request to get the details of the place.
            const service = new google.maps.places.PlacesService(map);
            service.getDetails(request, (placeDetails, status) => {

                // If the request was successful, create HTML content for the info window.
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    let content = `
                        <div>
                            <h2>${placeDetails.name}</h2>
                            <p>${placeDetails.formatted_address}</p>
                    `;
                    if (placeDetails.formatted_phone_number) {
                        content += `<p>Telefone: ${placeDetails.formatted_phone_number}</p>`;
                    }
                    if (placeDetails.website) {
                        content += `<p>Website: <a href="${placeDetails.website}" target="_blank">${placeDetails.website}</a></p>`;
                    }
                    content += `</div>`;

                    // Set the content of the info window and open it on the map.
                    infowindow.setContent(content);
                    infowindow.open(map, marker);
                }
            });
        });
    }
    function generateCSV(stores, placeName) {
        const header = "Nome da Empresa,Telefone,Site\n";
        // Create an array of rows for the CSV file by mapping over the stores array and concatenating the name, phone number, and website for each store.
        const rows = stores.map(store => `${store.name},${store.phone},${store.website}\n`);

        // Combine the header and rows into a single string.
        const csvContent = header + rows.join("");

        // Encode the CSV content as a URI component.
        const encodedUri = encodeURI(csvContent);

        // Create a link element to trigger the download of the CSV file and set its href and download attributes.
        const link = document.createElement("a");
        link.setAttribute("href", "data:text/csv;charset=utf-8," + encodedUri);
        link.setAttribute("download", `${placeName}.csv`);

        // Add the link element to the page and simulate a click to trigger the download.
        document.body.appendChild(link);
        link.click();
    }

}