'use strict';

angular.module('EnoticeBoardWebApp.pending', ['ngRoute', 'firebase'])

.config(['$routeProvider', function($routeProvider){
	$routeProvider.when('/pending',{
		templateUrl: 'pending/pending.html',
		controller: 'pendingCtrl'
	});
}])

.controller('pendingCtrl', ['$scope','CommonProp','$firebaseArray','$firebaseObject' ,function($scope,CommonProp,$firebaseArray,$firebaseObject){
	$scope.username = CommonProp.getUser();
  var Department;
  firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
         var userId = firebase.auth().currentUser.uid;
var reff =  firebase.database().ref('/Users/' + userId).once('value').then(function(snapshot) {
  Department = snapshot.val().department;
 
var ref = firebase.database().ref().child('posts').child(Department).child('Deptposts').orderByChild("approved").equalTo("pending");
$scope.articles  = $firebaseArray(ref);
});
  }
});

$scope.editPost = function(id){
      var ref = firebase.database().ref().child('posts').child(Department).child('Deptposts').child(id);
     $scope.editPostData = "true";
  console.log($scope.editPostData);
  ref.update({
  	approved : $scope.editPostData
  }).then(function(ref){
  	console.log(ref);
  },function(error){
    console.log(error);
  });
};

$scope.editcancel = function(id){
      var ref = firebase.database().ref().child('posts').child(Department).child('Deptposts').child(id);
     $scope.editPostData = "false";
  console.log($scope.editPostData);
  ref.update({
    approved : $scope.editPostData
  }).then(function(ref){
    console.log(ref);
  },function(error){
    console.log(error);
  });
};


	}])
 