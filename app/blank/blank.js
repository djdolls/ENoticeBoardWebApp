'use strict';

angular.module('EnoticeBoardWebApp.blank', ['ngRoute'])

.config(['$routeProvider', function($routeProvider){
	$routeProvider.when('/blank',{
		templateUrl: 'blank/blank.html',
		controller: 'blankCtrl'
	});
}])

.controller('blankCtrl', [function() {
		
}]);