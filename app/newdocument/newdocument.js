'use strict';
angular.module('EnoticeBoardWebApp.newdocument', ['ngRoute', 'firebase']).config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/newdocument', {
        templateUrl: 'newdocument/newdocument.html'
        , controller: 'newdocumentCtrl'
    });
}]).controller('newdocumentCtrl', ['$scope', function ($scope) {
    $scope.upload = function () {
        var file = document.getElementById('pdf').files[0];
        var filename = file.name;
        $scope.path = "/ViewerJS/#../uploadpic/" + filename;
    }
}]);