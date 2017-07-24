// app.js

var gType = 'delito',
  gMsg = [];

// define our application and pull in ngRoute and ngAnimate
var animateApp = angular.module('animateApp', ['ngRoute', 'ngAnimate', 'ngAria', 'amplify', 'ngMaterial', 'googlechart' ]);

// ROUTING ===============================================
// set our routing for this application
// each route will pull in a different controller
animateApp.config(function($routeProvider) {

    $routeProvider

        // login
        .when('/', {
            template: '<login-directive></login-directive>',
            controller: 'loginController'
        })

        .when('/login', {
            template: '<login-directive></login-directive>',
            controller: 'loginController'
        })

        // home
        .when('/home', {
            templateUrl: './html/page-home.html',
            controller: 'homeController'
        })

        // chat
        .when('/chat', {
            template: '<chat-directive></chat-directive>',
            controller: 'chatController'
        })

        // other
        .otherwise({ redirectTo: '/' });;

});


// DIRECTIVES =============================================

animateApp.directive('loginDirective', function () {
  return {
    restrict: 'E',
    scope: true,
    templateUrl: './html/page-login.html'
  }; 
});

animateApp.directive('chatDirective', function () {
  return {
    restrict: 'E',
    scope: true,
    templateUrl: './html/page-chat.html'
  }; 
});

// CONTROLLERS ============================================
// login controller
animateApp.controller('loginController', function($scope, $http, $window, localStorage, $location, $rootScope) {
    userName = '';
    if($window.orientation === undefined){}
    else{
        $rootScope.bodylayout = 'mobile'; 
    }
    $scope.user = {};
    $window.scrollTo(0, 0);
    $scope.pageClass = 'page-login';

    amplify.store("User", null);

    $scope.loginUser = function(){
        $http.post("login", $scope.user)
            .success(function(data, status, headers, config) {
                $scope.data = data;
                userTeam = data;
                amplify.store("User", data);
                $location.path('home');
            }).error(function(data, status, headers, config) {
                console.log(data);
                alert('Datos Erroneos.');
                $scope.status = status;
        });
    };
});

// home controller
animateApp.controller('homeController', function($scope, $window, $location) {
    $window.scrollTo(0, 0);
    $scope.pageClass = 'page-home';
    $scope.cities = [];
    var socket = io('http://104.41.158.6:3000');

    $scope.next = function(path){
        $location.path(path);
    };
    var mapOptions = {
        zoom: 15,
        center: new google.maps.LatLng(9.931003, -84.181058),
        mapTypeId: google.maps.MapTypeId.TERRAIN
    }

    socket.on('alert', function (data) {
        createMarker(data);
        $scope.messages.push(data);
        $scope.$apply().then();
    });
    $scope.myChartObject = {};
    
    $scope.myChartObject.type = "PieChart";

    $scope.myChartObject.data = {"cols": [
        {id: "t", label: "Lugares", type: "string"},
        {id: "s", label: "Asaltos", type: "number"}
    ], "rows": [
        {c: [
            {v: "Calle Malinche"},
            {v: 3},
        ]},
        {c: [
            {v: "Calle Lajas"},
            {v: 7}
        ]},
        {c: [
            {v: "Bosques de Lindora"},
            {v: 1},
        ]},
        {c: [
            {v: "San Cristobal"},
            {v: 4},
        ]},
        {c: [
            {v: "El Triunfo"},
            {v: 2},
        ]}
    ]};

    $scope.myChartObject.options = {
        'title': 'Lugares con más asaltos del mes',
        'backgroundColor': 'transparent',
        'is3D': 'true',
        'legend': "textStyle: {color: 'white'}"
    };

    $scope.map = new google.maps.Map(document.getElementById('map'), mapOptions);

    $scope.markers = [];
    $scope.messages = gMsg;
    
    var infoWindow = new google.maps.InfoWindow();
    
    var createMarker = function (info){
        var marker = new google.maps.Marker({
            map: $scope.map,
            position: new google.maps.LatLng(info.lat, info.long),
            title: info.type
        });
        
        
        $scope.markers.push(marker);
        
    }

    $scope.openInfoWindow = function(e, selectedMarker){
        e.preventDefault();
        google.maps.event.trigger(selectedMarker, 'click');
    }


    $scope.chatEmergency = function(type) {
        gType=type;
        $location.path('chat');
    }


});

// chat controller
animateApp.controller('chatController', function($scope, $http, $window, localStorage, $location, $rootScope) {
    
    $scope.pageClass = 'page-chat';
    $scope.messages = [];
    $scope.type = gType;

    var socket = io('http://104.41.158.6:3000');

    socket.on('message', function (data) {
        $scope.type = data.type;
        $scope.messages.push(data);
        $scope.$apply().then();
    });

    
    /*$http.get("chat", $scope.user)
        .success(function(data, status, headers, config) {
            $scope.data = data;
            $scope.messages = data.messages;
            console.log(data);
            console.log($scope.messages);
        }).error(function(data, status, headers, config) {
            console.log(data);
            alert('Datos Erroneos.');
            $scope.status = status;
    });*/
});


// done page controller
animateApp.controller('doneController', function($scope) {
    amplify.store("User", null);
    $scope.pageClass = 'page-done';
});
