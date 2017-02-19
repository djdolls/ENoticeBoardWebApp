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
  'EnoticeBoardWebApp.loader',
  'EnoticeBoardWebApp.dashboard',
  'EnoticeBoardWebApp.register',
  'EnoticeBoardWebApp.blank',
  'EnoticeBoardWebApp.newpost',
  'EnoticeBoardWebApp.uploadpic',
  'EnoticeBoardWebApp.viewdocument',
  'EnoticeBoardWebApp.otherdepartment',
  'EnoticeBoardWebApp.addtext',
  'EnoticeBoardWebApp.pdf',
  'EnoticeBoardWebApp.newdocument'



]).
config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {

  $routeProvider.otherwise({redirectTo: '/home'});
}]);
