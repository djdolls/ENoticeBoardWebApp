'use strict';

angular.module('EnoticeBoardWebApp.uploadpic', ['ngRoute'])

.config(['$routeProvider', function($routeProvider){
	$routeProvider.when('/uploadpic',{
		templateUrl: 'uploadpic/uploadpic.html',
		controller: 'uploadpicCtrl'
	});
}])

.controller('uploadpicCtrl', [function() {
		
}]);