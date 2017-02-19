'use strict';
angular.module('EnoticeBoardWebApp.pending', ['ngRoute', 'firebase']).config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/pending', {
        templateUrl: 'pending/pending.html'
        , controller: 'pendingCtrl'
    });
}]).controller('pendingCtrl', ['$scope', 'CommonProp', '$firebaseArray', '$firebaseObject', function ($scope, CommonProp, $firebaseArray, $firebaseObject) {
    $scope.username = CommonProp.getUser();
    var Department;
    var name;
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            var userId = firebase.auth().currentUser.uid;
            var reff = firebase.database().ref('/Users/' + userId).once('value').then(function (snapshot) {
                Department = snapshot.val().department;
                 name = snapshot.val().name;
                 $scope.name = name;
                  var Level = snapshot.val().level;
                  if(Level==2){
                    var ref = firebase.database().ref().child('posts').child(Department).child('Deptposts').orderByChild("approved").equalTo("pending");
                    $scope.articles = $firebaseArray(ref);
                }
                else{
                    alert("Not allowed to user this module");
                }
            });
        }
    });
    $scope.editPost = function (id) {
        var ref = firebase.database().ref().child('posts').child(Department).child('Deptposts').child(id);
        $scope.editPostData = "true";
        console.log($scope.editPostData);
        ref.update({
            approved: $scope.editPostData
        }).then(function (ref) {
            console.log(ref);
        }, function (error) {
            console.log(error);
        });
         
        var reff = firebase.database().ref().child('posts').child(Department).child('Deptposts').child(id).once('value').then(function (snapshot) {
               var Postusername = snapshot.val().department;
                var userDesc = snapshot.val().Desc;
                 var userName = snapshot.val().username;
                 var userId = firebase.auth().currentUser.uid;

                 var image = snapshot.val().images; 
                 var Title = snapshot.val().title; 
                var d = new Date();
                var n = d.getTime(); 
                var a = parseInt(-1*n); 
                var reff = firebase.database().ref().child('posts').child(Department).child('Approved');
                $scope.article  = $firebaseArray(reff);
                $scope.article.$add({
                     Desc : userDesc,
                     UID : userId,
                     approved : "true",
                     department : Postusername,
                     label : "urgent",
                     removed : 0,
                     servertime : a,
                     time : "12/01/2017",
                     title : Title,
                     type : 2,
                     username : userName
                    
                }).then(function (ref) {
                    console.log(ref);
                }, function (error) {
                    console.log(error);
                });
             
            
            });

    };
    $scope.editcancel = function (id) {
        var ref = firebase.database().ref().child('posts').child(Department).child('Deptposts').child(id);
        $scope.editPostData = "false";
        console.log($scope.editPostData);
        ref.update({
            approved: $scope.editPostData
        }).then(function (ref) {
            console.log(ref);
        }, function (error) {
            console.log(error);
        });
    };
    $scope.logout = function () {
        console.log("DJDJDJJDJ");
        CommonProp.logoutUser();
    };
	}])