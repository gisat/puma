$(document).ready(function () {

    var searchField = $("#iprQuerySearchInput");
    var searchButton = $("#iprQuerySearchButton");
    var searchOutput = $("#iprQuerySearchOutput");

    searchButton.on('click', function () {
        executeSearch();
    });

    searchField.on('keydown', function (event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == '13') {
            executeSearch();
        }
    });

    function executeSearch() {
        var searchValue = searchField.val();
        if (searchValue.length > 0 && searchButton.val().contains("Vyhledat")) {
            searchButton.val("Vyhledávám...");
            searchOutput.hide();
            var searchRequest = $.ajax({
                url: "/iprquery",
                method: "POST",
                data: {search: searchValue},
                dataType: "html"
            });
            searchRequest.always(function (data, statusText, jqXHR) {
                if (statusText == "success") {
                    var response = $.parseJSON(data);
                    searchOutput.text(response.content);
                    searchOutput.show();
                } else {
                    var error = $.parseJSON(data.responseText);
                    searchOutput.text(error.message);
                    searchOutput.show();
                }
                searchButton.val("Vyhledat...");
            });
        } else {
            searchOutput.hide();
            searchOutput.val("");
        }
    }
});