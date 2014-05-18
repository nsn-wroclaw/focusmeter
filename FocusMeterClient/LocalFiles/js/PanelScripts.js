var histData = null;
var graphData = [
                 ['Time', 'Opinion',],
                 ['12:30', 0],
                 ['12:35', 1],
                 ['12:40', 1.7],
                 ['12:50', 1.6],
                 ['13:05', 0.7],
                 ['13:10', 0.2],
                 ['13:15', - 0.5],
                 ['13:20', 0],
                 ['13:25', 0.2],
             ];

// google charts..
google.load("visualization", "1", {
    packages: ["corechart"]
});
google.setOnLoadCallback(redrawCharts);


/*
Przej�cie do widoku Charts, b�d�cego panalem widocznym tylko dla prowadz�cego spotkanie powoduje wyzwolenie funckcji �$(document).ready�. 
Wywo�ywana jest  w niej funkcja initTimer() (1.2.2), a nast�pnie initStartEndButton() (1.2.3). Do obecnego widoku mo�emy 
dosta� si� tylko loguj�c si� na odpowiednie spotkanie w widoku JoinMeeting. Uzupe�nia ona pami�� LocalStorage urz�dzenia
o pola meetingCode oraz adminCode, kt�re s� przypisywane zmiennym.
Widoczne dla u�ytkownika pola code- informuj�ce o kodzie bie��cego spotkania oraz adminCode zostaj� 
uzupe�nione o odpowiednio sformatowany tekst ze zmeinnych meetinfCode oraz adminCode. 
Wywo�ana zostaje funkcja getVotes (1.2.4), kt�ra w argumencie przyjmuje kod spotkania, a tak�e funkcje 
setInterval (1.2.6) oraz StartAndStop (1.2.6) w wypadku klikni�cia przycisku odpowiadaj�cego za rozpocz�cia lub zako�czenie spotkania.

*/

$(document).ready(function() {

    var meetingCode;
    var adminCode;
    var started;

    initTimer();

    initStartEndButton();

    if (typeof(Storage) != "undefined") {
        meetingCode = localStorage.getItem("meetingCode");
        adminCode = localStorage.getItem("meetingCodeControl");
    } else {
        meetingCode = "dupa";
    }

    $("#code_1").val(meetingCode.charAt(0));
    $("#code_2").val(meetingCode.charAt(1));
    $("#code_3").val(meetingCode.charAt(2));
    $("#code_4").val(meetingCode.charAt(3));
    $("#code_5").val(meetingCode.charAt(4));

    $("#adminCode_1").val(adminCode.charAt(0));
    $("#adminCode_2").val(adminCode.charAt(1));
    $("#adminCode_3").val(adminCode.charAt(2));
    $("#adminCode_4").val(adminCode.charAt(3));
    $("#adminCode_5").val(adminCode.charAt(4));

    getVotes(meetingCode);

    setInterval(function(){getVotes(meetingCode)}, 10000);

    $("#changeTime").click(function() {startAndStop(adminCode)});

    // Redraw charts on tab click or resize
    $('#myTab a').click(function(e) {
        e.preventDefault();
        $(this).tab('show');
    }).on('shown.bs.tab', redrawCharts);
    $(window).resize(redrawCharts);

});


function redrawCharts() {
	if (histData !== null) {
        drawHistogram();
	}
	if (graphData !== null) {
		drawGraph();
	}
}


function getVotes(meetingCode) {
    $.ajax({
        type: "GET",
        url: "http://antivps.pl:3033/vote/average/" + meetingCode,
        success: function(data) {
            refreshProgressBar(data.value);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            alert("Error, status: " + textStatus + ", errorThrown: " + errorThrown);
        }
    });

    $.ajax({
        type: "GET",
        url: "http://antivps.pl:3033/vote/" + meetingCode,
        success: function(data) {
        	histData = data;
            drawHistogram(data);
        },
        error: function(jqXHRm, textStatus, errorThrown) {
            if (jqXHR.status === 0) {
                alert("Verify network.");
            } else if (jqXHR.status == 404) {
                alert("Requested page not found.");
            } else if (jqXHR.status == 500) {
                alert("Internal Server Error.");
            } else if (textStatus === "timeout") {
                alert("Time out error.");
            } else {
                alert("Uncaught Error.\n" + jqXHR.responseText);
            }
        }
    });
};
/**
Funkcja przyjmuj�c w argumencie aktualn� ocen� spotkania (liczba rzeczywista z zakresu -2 do 2), przelicza j� na warto�� procentow�.
W oparciu o obliczon� warto�� uzupe�nia wska�nik jako�ci spotkania- progressBar, definiuj�c jego rozmiar oraz nadaj�c mu odpowiedni kolor
*/

function refreshProgressBar(average) {
    var gradePercent = ((average + 2) / 4) * 100;
            
    $("#meetingGrade").attr('style', "width: " + gradePercent + "%");

    switch (true) {
        case (gradePercent <= 20):
            $('#meetingGrade').attr('class', "progress-bar progress-bar-danger");
            break;
        case (gradePercent < 40 && gradePercent > 20):
            $('#meetingGrade').attr('class', "progress-bar progress-bar-warning");
            break;
        case (gradePercent <= 60 && gradePercent >= 40):
            $('#meetingGrade').attr('class', "progress-bar progress-bar-info");
            break;
        case (gradePercent < 80 && gradePercent > 60):
            $('#meetingGrade').attr('class', "progress-bar progress-bar-success");
            break;
        case (gradePercent >= 80):
            $('#meetingGrade').attr('class', "progress-bar progress-bar-success");
            break;
        default:
            $('#meetingGrade').attr('class', "progress-bar");
    }
};

function drawHistogram(data) {

	// Take data from current or previous response
	data = data || histData;

    var formatedData = google.visualization.arrayToDataTable(
        convertJsonToGoogleFormat(data));

    var options = {
        title: "Histogram",
        width: "100%",
        height: "100%",
        bar: {
            groupWidth: "85%"
        },
        chartArea: {
            width: "80%",
            height: "70%"
        },
        legend: {
            position: "none"
        },
        dataOpacity: 0.9,
    };

    var chartDiv = document.getElementById('hist_div');

    var chart = new google.visualization.ColumnChart(chartDiv);

    chart.draw(formatedData, options);
}


/**
 * Function converting the JSON object returned by Focus Meter Server to an array
 * needed by Google Charts API.
 * @param votesData - object with number of votes
 * @return an array.
 */
function convertJsonToGoogleFormat(votesData) {
    var resultArray = [['Grade', 'Votes', {role: 'style'}]];

    resultArray.push(['Disaster', votesData.disaster, 'color: #E0553B']);
    resultArray.push(['Boring', votesData.boring, 'color: #E58955']);
    resultArray.push(['OK', votesData.ok, 'color: #27B0F4']);
    resultArray.push(['Great', votesData.great, 'color: #458BF6']);
    resultArray.push(['Awesome', votesData.awesome, 'color: #0FC085']);

    return resultArray;
}


function drawGraph(data) {

	// Take data from current or previous response
	data = data || graphData;

    var formatedData = google.visualization.arrayToDataTable(data);

    var options = {
    title: 'Graph',
    curveType: 'function',
    legend: { position: 'none' },
    vAxis: {
        minValue: -2,
        maxValue: 2
    },
    // chartArea: {
    //         width: "80%",
    //         height: "70%"
    //     },
    dataOpacity: 0.9,
  };

    var chart = new google.visualization.LineChart(document.getElementById('graph_div'));
    chart.draw(formatedData, options);
}


function goBackToStartScreen() {
    window.location = './index.html';
}

/*
Funkcja odpowiada za poprawne wy�wietlenie warto�ci na stoperze spotkania, jak r�wnie� dba o ustawienie przycisku rozpoczynaj�cego
lub ko�cz�cego spotkanie w odpowiedni stan. Jest wywo�ywana za ka�dym razem, gdy u�ytkownik zaloguje sie na spotkanie - obejmuje to
r�wnie� przypadek, gdy urz�dzenie prowadz�cego zostanie odblokwane. Funkcja musi dzia�a� poprawnie uwzgl�dniaj�c ostatni rzeczywisty 
stan spotkania. W oparciu o aktualny stan spotkania, zapami�tany w pami�ci urz�dzenia czas startu spotkania oraz czas bie��cy, pola widoku s� odpowiednio konfigurowane.
Kolejna cz�� funkcji odpowiada za poprawne wystartowanie stopera. W oparciu o czas trwania odbywaj�cego si� spotkania uzupe�niane jest 
pole timeToAdd pami�ci urz�dzenia. Zmienna ta zostanie dodawana za ka�dym razem do czasu pokazywanego na stoperze. Tworzony zostaje nowy 
obiekt Stopwatch (1.2.7) z odst�pem czasu aktualizacji zegara co 1 sekund� oraz czasem trwania spotkania. Gdy status spotkania jest r�wny 1,
znaczy to, �e spotkanie trwa. Musimy wi�c wystartowa� stoper korzystaj�c z funkcji obiektu Stopwatch execute (1.2.7.1)

*/
function initTimer() {
    var isStarted = localStorage.getItem("started");
    
    if(isStarted == '0'){
      localStorage.removeItem("timeToAdd");
      $('#htmlTimer').attr("value", '00:00:00' );

    }
    //if it was started before and meeting is running
     else{

        var startingTimeString = localStorage.getItem("startTime");
       

        // var startingTime = Date.now(startingTimeString);
        var startingTime = parseInt(startingTimeString);

        var currentMeetingDuration;

        // If the meeting is finished we want to show on timer the length of it.
        // If the meeting is still running, we want to show the time from start of meeting till now.
        if(isStarted == '1') {
            currentMeetingDuration = (new Date()).getTime() - startingTime;
        }
        else if(isStarted == '2') {
            var endTimeString = localStorage.getItem("endTime");

            var endingTime = parseInt(endTimeString);

            currentMeetingDuration = endingTime - startingTime;
        }

        var SecondsTillBegin = Math.floor(currentMeetingDuration/1000);
        var SecondsString = SecondsTillBegin.toString();
        var TimeTillBegin = SecondsString.toHHMMSS();
        $('#htmlTimer').attr("value", TimeTillBegin );

        var startingTimeString = localStorage.setItem("timeToAdd", currentMeetingDuration );
        //ustawic offset odliczania oraz wystartowac timer
        d = document.getElementById("d-timer");
        dTimer = new Stopwatch(d, { delay: 1000 }, Date.now(currentMeetingDuration));
        dTimer.offset = currentMeetingDuration;

        // Run timer if meeting isn't finished.
        if(isStarted == '1') {
            dTimer.execute();
        }


    }
}
/*
Funkcja ma za zadanie wype�nienia odpowiedni� zawarto�ci� przycisku ko�cz�cego lub zaczynaj�cego spotkanie, w wypadku jego zako�czenia.
*/
function initStartEndButton() {
    var isStarted = localStorage.started;

    // If the meeting is finished, disable timer button.
    if (isStarted == '2') {
        $('#changeTime').toggleClass('btn-info');
        $('#changeTime').attr('value', 'Meeting finshed');
        $('#changeTime').attr('disabled', 'true');
    }

    // If the meeting is still running, we don't need to change button, because it is already done in 
    // dTimer.execute()
}

/**
 * Function gets average vote value from server with specific meeting code and changes progress bar
 * which shows average grade.
 * @param {string} meetingCode - meeting code generated by server.
 */





/**
 * Function sends request to the server to start or stop specific meeting.
 */
var startAndStop = function(adminCode) {
    var date = new Date();

    var url;
    var key;

    if (typeof(Storage) != "undefined") {
        started = localStorage.getItem("started");
    }

    if (started == "0") {
        url = "http://antivps.pl:3033/meeting/start";
        $.ajax({
            type: "POST",
            url: url,
            data: {
                "adminCode": adminCode,
                "start": date
            },
            processData: true,
            success: function(data) {
                alert(data.message);

                if (typeof(Storage) != "undefined") {
                    localStorage.setItem("started", "1");
                    localStorage.setItem("startTime", date.getTime().toString());
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("Error, status: " + textStatus + ", errorThrown: " + errorThrown);
            }
        });
    } else if (started == "1") {
        url = "http://antivps.pl:3033/meeting/end";

        $.ajax({
            type: "POST",
            url: url,
            data: {
                "adminCode": adminCode,
                "end": date
            },
            processData: true,
            success: function(data) {
                alert(data.message);

                if (typeof(Storage) != "undefined") {
                    localStorage.setItem("started", "2");
                    localStorage.setItem("endTime", date.getTime().toString());
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("Error, status: " + textStatus + ", errorThrown: " + errorThrown);
            }
        });
    } else {
        alert("Forbidden.");
    }
};