'use strict';
angular.module('EnoticeBoardWebApp.editprofile', ['ngRoute']).config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/editprofile', {
        templateUrl: 'editprofile/editprofile.html'
        , controller: 'editprofileCtrl'
    });
}]).controller('editprofileCtrl', ['$scope', 'CommonProp', '$firebaseArray', '$firebaseObject', '$firebaseAuth', '$location', function ($scope, CommonProp, $firebaseArray, $firebaseObject, $firebaseAuth, $location) {
    $scope.username = CommonProp.getUser();
    var Department;
    var name;
    var Id = firebase.auth().currentUser.uid;
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            var userId = firebase.auth().currentUser.uid;
            var reff = firebase.database().ref('/Users/' + userId).once('value').then(function (snapshot) {
                Department = snapshot.val().department;
                name = snapshot.val().name;
                $scope.depth = Department; //Department
                console.log(Department);
                $scope.name = name; //username
                console.log(name);
                $scope.profileimg = snapshot.val().images;
                var Level = snapshot.val().level;
                if (Level == 2 || Level == 3) {
                    var ref = firebase.database().ref().child('Users').child(userId);
                    $scope.articles = $firebaseArray(ref);
                    //var ref1 = firebase.database().ref().child('posts').child(Department).child('Pending').orderByChild("approved").equalTo("pending");;
                    //  $scope.pending = $firebaseArray(ref1);
                    // var ref11 = firebase.database().ref().child('posts').child(Department).child('Approved').orderByChild("servertime").limitToFirst(3);
                    //  $scope.notify = $firebaseArray(ref11);
                    //  var ref2 = firebase.database().ref().child('Users').orderByChild("department").equalTo(Department);
                    //  $scope.users = $firebaseArray(ref2);
                    //  console.log($scope.pending);
                    //  var principal = firebase.database().ref().child('posts').child('ALL').child('Approved').orderByChild("servertime");
                    //  $scope.principal1 = $firebaseArray(principal);
                }
            });
        }
        else {
            alert("please sign in");
        }
    });
    $scope.upload = function () {
        //alert("dj")
        var file = document.getElementById('pic').files[0];
        var filename = file.name;
        var storageRef = firebase.storage().ref('/dogimages/' + filename);
        var uploadTask = storageRef.put(file);
        var downloadURL;
        uploadTask.on('state_changed', function (snapshot) {
            // Observe state change events such as progress, pause, and resume
            // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
            var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + progress + '% done');
            switch (snapshot.state) {
            case firebase.storage.TaskState.PAUSED: // or 'paused'
                console.log('Upload is paused');
                break;
            case firebase.storage.TaskState.RUNNING: // or 'running'
                console.log('Upload is running');
                break;
            }
        }, function (error) {
            // Handle unsuccessful uploads
        }, function () {
            // Handle successful uploads on complete
            // For instance, get the download URL: https://firebasestorage.googleapis.com/...
            downloadURL = uploadTask.snapshot.downloadURL;
            $scope.path = downloadURL;
            console.log(downloadURL);
        });
    };
    $scope.editPost = function () {
        var ref = firebase.database().ref().child('Users').child(Id);
        var Name = $scope.name;
        Name = $scope.articles.name;
        $scope.profileimg = $scope.path;
        console.log($scope.path);
        ref.update({
            name: Name
            , images: $scope.path
        }).then(function (ref) {
            console.log(ref);
        }, function (error) {
            console.log(error);
        });
    };
    $scope.logout = function () {
        console.log("DJDJDJJDJ");
        CommonProp.logoutUser();
    }
    $scope.deleteCnf = function (user) {
        $scope.deleteArticle = user;
        console.log($scope.deleteArticle.username);
    };
    $scope.viewCnf = function (user) {
        $scope.viewArticles = user;
        console.log($scope.viewArticles);
    };
    $scope.deletepost = function (deleteArticle) {
        $scope.articles.$remove(deleteArticle);
        $("#deleteModal").modal('hide');
    };
  }])