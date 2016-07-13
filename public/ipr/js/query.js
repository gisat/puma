$(document).ready(function () {

    var searchField = $("#iprQuerySearchInput");
    var searchButton = $("#iprQuerySearchButton");
    var searchOutput = $("#iprQuerySearchOutput");
    var searchSelect = $("#iprQuerySelect");

    searchButton.on('click', function () {
        executeSearch();
    });

    searchField.on('keydown', function (event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == '13') {
            //executeSearch();
        }
    });

    function executeSearch() {
        var searchValue = searchField.val();
        if (searchValue.length > 0 && searchButton.val().indexOf("Vyhledat") >= 0) {
            searchButton.val("Vyhledávám...");
            searchOutput.hide();
            var searchRequest = $.ajax({
                url: "/iprquery",
                method: "POST",
                data: { search: searchValue, source: searchSelect.val() },
                dataType: "json",
                timeout: 15000
            });
            searchRequest.always(function (data, statusText, jqXHR) {
                if ( statusText == "success" ) {
                    searchOutput.html(data.body);
                } else {
                    searchOutput.text(statusText);
                }
                searchOutput.show();
                searchButton.val("Vyhledat...");
            });
        } else {
            searchOutput.hide();
            searchOutput.val("");
        }
    }
});