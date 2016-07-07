$(document).ready( function () {

    $("#iprQuerySearchInput").on( 'input', function () {

        var searchOutput = $("#iprQuerySearchOutput");
        var searchValue = $("#iprQuerySearchInput").val();
        
        if( searchValue.length  > 0 ) {

            searchOutput.show();

            var searchRequest = $.ajax({
                url: "/iprquery",
                method: "POST",
                data: { search: searchValue },
                dataType: "html"
            });

            searchRequest.always(function( data, statusText, jqXHR ) {

                searchOutput.show();

                if ( statusText == "success" ) {

                    var response = $.parseJSON( data );
                    searchOutput.text( response.search );

                } else {

                    var error = $.parseJSON( data.responseText );
                    searchOutput.text( error.message );

                }

            });

        } else {

            searchOutput.hide();

        }

    })
});