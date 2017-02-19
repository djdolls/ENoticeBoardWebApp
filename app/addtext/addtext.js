'use strict';

angular.module('EnoticeBoardWebApp.addtext', ['ngRoute'])

.config(['$routeProvider', function($routeProvider){
	$routeProvider.when('/addtext',{
		templateUrl: 'addtext/addtext.html',
		controller: 'addtextCtrl'
	});
}])

.controller('addtextCtrl', ['$scope', '$firebaseArray', '$firebaseObject', '$firebaseAuth', function ($scope, $firebaseArray, $firebaseObject, $firebaseAuth) {
    var ref;
    var downloadURL;
    var Department;
    var Name;
    var userId
    var useremail;
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();
    if (dd < 10) {
        dd = '0' + dd;
    }
    if (mm < 10) {
        mm = '0' + mm;
    }
    var today = dd + '/' + mm + '/' + yyyy;
    console.log(today);
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            userId = firebase.auth().currentUser.uid;
            useremail = firebase.auth().currentUser.email;
            var reff = firebase.database().ref('/Users/' + userId).once('value').then(function (snapshot) {
                Department = snapshot.val().department;
                Name = snapshot.val().name;
                 name = snapshot.val().name;
                 $scope.name = Name;
                ref = firebase.database().ref().child('posts').child(Department).child('TextPost');
                $scope.articles = $firebaseArray(ref);
            });
        }
    });
   
    $scope.createPost = function () {
        var title = $scope.articles.titletxt;
        var post = $scope.articles.posttxt;
        console.log(useremail);
        $scope.articles.$add({
            title: title
            , Desc: post
            , UID: userId
            , approved: "true"
            , time: today
            , username: Name
            , department: Department
            , email: useremail
            , removed: 1
        }).then(function (ref) {
            console.log(ref);
        }, function (error) {
            console.log(error);
        });
    };
	}]);
angular.module('MyApp').controller('AppCtrl', function ($scope) {
    $scope.users = ['Fabio', 'Leonardo', 'Thomas', 'Gabriele', 'Fabrizio', 'John', 'Luis', 'Kate', 'Max'];
});