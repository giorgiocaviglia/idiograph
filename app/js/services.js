'use strict';

/* Services */

angular.module('myApp.services', [])
	.factory('dataService', function ($http, $q, $timeout) {
		  
		  return {
		    
		    loadData : function(url){
		      var deferred = $q.defer();
		      $http.get(url)
			      .then(function(response){
			          deferred.resolve(response.data);
			      },
			      function(){
			          deferred.reject("An error occured while fetching data.");
			      });
		      
		      return deferred.promise;
		    },

		    debounce : function (func, wait, immediate) {
			    var timeout;
			    var deferred = $q.defer();
			    return function() {
			      var context = this, args = arguments;
			      var later = function() {
			        timeout = null;
			        if(!immediate) {
			          deferred.resolve(func.apply(context, args));
			          deferred = $q.defer();
			        }
			      };
			      var callNow = immediate && !timeout;
			      if ( timeout ) {
			        $timeout.cancel(timeout);
			      }
			      timeout = $timeout(later, wait);
			      if (callNow) {
			        deferred.resolve(func.apply(context,args));
			        deferred = $q.defer();
			      }
			      return deferred.promise;
			    };
			  }

	  	}
	})
