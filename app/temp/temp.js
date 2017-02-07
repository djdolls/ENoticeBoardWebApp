'use strict';

angular.module('EnoticeBoardWebApp.temp', ['ngRoute'])

.config(['$routeProvider', function($routeProvider){
	$routeProvider.when('/temp',{
		templateUrl: 'temp/temp.html',
		controller: 'TempCtrl'
	});
}])

.controller('TempCtrl', [function() {
		
}]);
 