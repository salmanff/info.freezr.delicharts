/*
delcharts - Uses vulog data to create weekly charts of web usage
*/

var delicharts = {
    'period': 'week',
    'endtime': null,      // for current perid charted, the end of the chart
    'starttime':null,     // for current perid charted, the start of the chart
    'tzOffset': 0,        // time zone - uses current (todo - make dynamic if vulog supports it)
    'logData': {},        // crude dump of all the logData recorded
    'listData': [],        // crude ordered list of the same data for purpose of creating chart
    'lastRecordT': null,  // 
    'domainAppShowing':null
}

var ctx, theBarChart;


// Views / html 
var initChartGraphics = function () {
    document.getElementById("chart_container").style.display="none";
    document.getElementById("spinner").style.display="block";
    start = new Date(delicharts.starttime-  delicharts.tzOffset+100000);
    end = new Date(delicharts.endtime+delicharts.tzOffset);
    document.getElementById("chartTitle").innerText= "Minutes Spent Online from "+start.toDateString()+" "+start.toTimeString()+" to "+end.toDateString();
}
var showChartGraphics = function () {
    document.getElementById("chart_container").style.display="block"
    document.getElementById("spinner").style.display="none";
}

// Initializing page
freezr.initPageScripts = function() {
    document.addEventListener('click', function(e) { 
        var elSects = e.target.id.split('_');
        if (elSects[0]== "click") {doClick(elSects)}
    }, false);    

    var now = new Date();
    delicharts.tzOffset = now.getTimezoneOffset()*60*1000;

    var nextSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate()+(now.getDay()==0? 1:8-now.getDay()));
    initStartEndDates(nextSunday.getTime() +  delicharts.tzOffset);
}
var doClick = function (args) {
    switch(args[1]) {
        case 'previousPeriod':
            initStartEndDates(delicharts.starttime);
            break;
        case 'nextPeriod':
            initStartEndDates(delicharts.endtime+(7*24*3600*1000));
            break;
        default:
             console.log('Error: undefined click ')
    }
}
Chart.defaults.global.legend.onClick = function(x,y) {
    //onsole.log("index "+JSON.stringify(y))
    if (delicharts.domainAppShowing==y.text) {
        delicharts.domainAppShowing=null;
    } else {
        delicharts.domainAppShowing=y.text;
    }
    showAllSites()
};   
var showAllSites=function() {
    if (!delicharts.domainAppShowing) {
        document.getElementById("urlDetails").innerText="";
    } else {
        document.getElementById("urlDetails").innerHTML="<br/><b>"+delicharts.domainAppShowing+"</b><br/>";

        var theTime;
        for (var aUrl in delicharts.logData[delicharts.domainAppShowing].urls ) {
            if (delicharts.logData[delicharts.domainAppShowing].urls.hasOwnProperty(aUrl)) {
                theTime = Math.round(10*delicharts.logData[delicharts.domainAppShowing].urls[aUrl]/(60*1000))/10
                document.getElementById("urlDetails").innerHTML += "<div class='urlContainer'><span class='urlDetailsTime'>"+theTime.toFixed(1)+"</span> : <a href='"+aUrl+"'' class='actualUrl'>"+aUrl+"</a></div>";
            }
        }
        document.body.scrollTop = document.body.scrollHeight;
    }
}

// Initialise chart
var initStartEndDates = function (endtime){ 
    if (theBarChart) theBarChart.destroy();

    delicharts.domainAppShowing=null;
    showAllSites();

    var nextSunday = new Date(endtime);
    var lastSunday = getStartDate(nextSunday);

    delicharts.endtime = nextSunday.getTime();
    delicharts.starttime = lastSunday.getTime();
    delicharts.lastRecordT=delicharts.endtime;
    delicharts.logData={};
    delicharts.listData=[];

    initChartGraphics();

    getMorePeriodData();
}
var getStartDate = function (endDate) {
    var daydiffs = 7;
    return new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()-daydiffs, endDate.getHours(), endDate.getMinutes(), endDate.getSeconds()  );
}
var setNextPeriod = function () {
    delicharts.endtime = delicharts.starttime+0;
    endDay = new Date(delicharts.endtime)
    delicharts.starttime = getStartDate(endDay).getTime();
    delicharts.lastRecordT=delicharts.endtime;
    delicharts.logData={};
}
var getMorePeriodData = function(){
    //
    freezr.db.query(recordLogs, 'my_logs', {'requestee_app':'info.freezr.vulog' ,'query_params':{ 'vulog_timestamp':{'$lt':delicharts.lastRecordT}  } })
}
var recordLogs = function(resp) {
    resp = freezr.utils.parse(resp);
    if (resp.error) {
        document.getElementById("chart_container").style.display="none";
        document.getElementById("chartTitle").style.display="none";
        document.getElementById("spinner").style.display="none";
        document.getElementById("warnings").style.display="block";
        if (resp.code == "authentication") {
            document.getElementById("warnings").innerHTML = "You have not granted permission to this app. Please go to vulog and grant permission";
        } else {
            document.getElementById("warnings").innerHTML = "Error getting records";            
        }
    } else if (resp.results && resp.results.length>0) {
        document.getElementById("warnings").style.display="none";
        for (var i=0; i<resp.results.length; i++) {
            var timestamp = resp.results[i].vulog_timestamp? resp.results[i].vulog_timestamp: resp.results[i]._date_Modified;
            var dayString = getDayString(timestamp+delicharts.tzOffset);
            var domain_app = resp.results[i].domain_app
            var d = new Date (timestamp);
            if (timestamp >= delicharts.starttime) {
                if (!delicharts.logData[domain_app])  delicharts.logData[domain_app]={ttl_time:0, ttl_visits:0, days:{}, urls:{}, domain_app:domain_app};
                if (!delicharts.logData[domain_app].days[dayString]) delicharts.logData[domain_app].days[dayString]={'visits':0, 'time':0}

                delicharts.logData[domain_app].ttl_time +=resp.results[i].vulog_ttl_time?resp.results[i].vulog_ttl_time:0;
                delicharts.logData[domain_app].days[dayString].time += resp.results[i].vulog_ttl_time? resp.results[i].vulog_ttl_time:0;
                if (delicharts.logData[domain_app].urls[resp.results[i].url]) {
                    delicharts.logData[domain_app].urls[resp.results[i].url] +=resp.results[i].vulog_ttl_time?resp.results[i].vulog_ttl_time:0;
                } else {
                    delicharts.logData[domain_app].urls[resp.results[i].url] =  (resp.results[i].vulog_ttl_time?resp.results[i].vulog_ttl_time:0);   
                }
                // todo num of visits
                delicharts.lastRecordT=timestamp ;
            } else {
                delicharts.lastRecordT=delicharts.starttime;
                break;
            }
            //onsole.log(i+" - "+ domain_app+" - "+dayString+ " "+(resp.results[i].vulog_ttl_time? (resp.results[i].vulog_ttl_time/3600000):" NULL"));
        }
    } else {
        delicharts.lastRecordT=delicharts.starttime;
        
    }
    if (delicharts.lastRecordT <= delicharts.starttime ) {
        chartData();
    } else if (!resp.error && resp.results && resp.results.length>0){
        getMorePeriodData();
    }
}
var chartData = function(){
    // put into listData in ordered list and then show chart
    for (var domain_app in delicharts.logData ) {
        if (delicharts.logData.hasOwnProperty(domain_app)) {
            delicharts.listData.push(delicharts.logData[domain_app])
        }
    }
    delicharts.listData.sort(sortByTtlTime);

    showChartGraphics();
    ctx = document.getElementById("theChart");
    theBarChart = new Chart(ctx, {
        type: 'bar',
        data: constructChartData(),
        options: {
            scales: {
                yAxes: [{
                    stacked: true
                }],
                xAxes: [{
                    stacked: true
                }]
            }
        }

    } )  
}
var constructChartData = function() {
    const LABELS_PER_CHART = 9;
    const NUM_OF_DAYS= 7;
    const COLORS = ["blue","lightgray","black","green","red","darkgray","lime","orange","olive","brown","yellow"];

    var tempdata = {labels: getChartDayLabels(delicharts.endtime,NUM_OF_DAYS), datasets:[]}
    var tempdataset, dayTime;
    var days = getChartDayStrings(delicharts.endtime,NUM_OF_DAYS);
    var otherSites = {label:"Other", backgroundColor:COLORS[COLORS.length-1], data:new Array(NUM_OF_DAYS).fill(0)};

    for (var i=0; i<delicharts.listData.length; i++) {
        // Add data
        if (i<LABELS_PER_CHART) tempdataset = {label:delicharts.listData[i].domain_app, backgroundColor:COLORS[i], data:[]}
        for (var j=0; j<days.length; j++) {
            //onsole.log("checking day "+days[j]+" day "+JSON.stringify(delicharts.listData[i][days[j]]))
            dayTime = delicharts.listData[i].days[days[j]]? Math.round(10*delicharts.listData[i].days[days[j]].time/(1000*60))/10:0;
            if (i<LABELS_PER_CHART){
                tempdataset.data.push(dayTime);
            } else {
                otherSites.data[j] = otherSites.data[j] + dayTime;
            }
        }
        if (i<LABELS_PER_CHART) tempdata.datasets.push(tempdataset);
    }
    tempdata.datasets.push(otherSites)

    return tempdata;
    //...
}

// helper functions
var getDayString = function(timestamp) {
    day = new Date(timestamp);
    return day.getFullYear()+"-"+(day.getMonth()+1)+"-"+day.getDate();
}
var sortByTtlTime = function(obj1,obj2) {
    return obj2.ttl_time - obj1.ttl_time;
}
var getChartDayStrings = function(endtime,numDays){
    var tempret = [];
    for (var i=0; i<numDays; i++) {
        tempret.unshift(getDayString(endtime));
        endtime += (-24*60*60*1000)
    }
    return tempret
}
var getChartDayLabels = function(endtime,numDays){
    var theDay, tempret = [];
    const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
    for (var i=0; i<numDays; i++) {
        theDay = new Date(endtime);
        tempret.unshift(DAYS[theDay.getDay()]+" "+theDay.getDate());
        endtime += (-24*60*60*1000)
    }
    return tempret
}


