'use strict';
angular.module('EnoticeBoardWebApp.dashboard', ['ngRoute']).config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/dashboard', {
        templateUrl: 'dashboard/dashboard.html'
        , controller: 'dashboardCtrl'
    });
}]).controller('dashboardCtrl', ['$scope', 'CommonProp', '$firebaseArray', '$firebaseObject', '$firebaseAuth', '$location', function ($scope, CommonProp, $firebaseArray, $firebaseObject, $firebaseAuth, $location) {
    $scope.username = CommonProp.getUser();
    var Department;
    var name;
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            var userId = firebase.auth().currentUser.uid;
            var reff = firebase.database().ref('/Users/' + userId).once('value').then(function (snapshot) {
                Department = snapshot.val().department;
                name = snapshot.val().name;
                $scope.depth = Department; //Department
                $scope.name = name; //username
                var ref = firebase.database().ref().child('posts').child(Department).child('Deptposts').orderByChild("approved").equalTo("true");
                $scope.articles = $firebaseArray(ref);
                var ref1 = firebase.database().ref().child('posts').child(Department).child('Deptposts').orderByChild("approved").equalTo("pending");
                $scope.pending = $firebaseArray(ref1);
                var ref2 = firebase.database().ref().child('Users').orderByChild("department").equalTo(Department);
                $scope.users = $firebaseArray(ref2);
                console.log($scope.pending);
            });
        }
        else {
            alert("please sign in");
        }
    });
    $scope.editPost = function (id) {
        var ref = firebase.database().ref().child('posts').child(Department).child('Deptposts').child(id);
        $scope.editPostData = "true";
        console.log($scope.editPostData);
        ref.update({}).then(function (ref) {
            console.log(ref);
        }, function (error) {
            console.log(error);
        });
    };
    $scope.logout = function () {
        console.log("DJDJDJJDJ");
        CommonProp.logoutUser();
    }
  }])