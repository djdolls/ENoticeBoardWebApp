'use strict';

// Declare app level module which depends on views, and components
angular.module('EnoticeBoardWebApp', [
  'ngRoute',
  'EnoticeBoardWebApp.home',
  'EnoticeBoardWebApp.welcome',
  'EnoticeBoardWebApp.pending',
  'EnoticeBoardWebApp.profile',
  'EnoticeBoardWebApp.viewuser',
  'EnoticeBoardWebApp.addpost',
  'EnoticeBoardWebApp.temp',
  'EnoticeBoardWebApp.dashboard',
  'EnoticeBoardWebApp.register',
  'EnoticeBoardWebApp.newdocument'



]).
config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {

  $routeProvider.otherwise({redirectTo: '/home'});
}]);
