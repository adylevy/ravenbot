/*global angular*/
(function () {
    "use strict";

    var app = angular.module('myApp', ['ng-admin']);

    app.controller('main', function ($scope, $rootScope, $location) {
        $rootScope.$on('$stateChangeSuccess', function () {
            $scope.displayBanner = $location.$$path === '/dashboard';
        });
    });

    app.config(function (NgAdminConfigurationProvider, RestangularProvider) {
        var nga = NgAdminConfigurationProvider;

        function truncate(value) {
            if (!value) {
                return '';
            }

            return value.length > 50 ? value.substr(0, 50) + '...' : value;
        }

        // use the custom query parameters function to format the API request correctly
        RestangularProvider.addFullRequestInterceptor(function(element, operation, what, url, headers, params) {
            if (operation == "getList") {
                // custom pagination params
                if (params._page) {
                    params._start = (params._page - 1) * params._perPage;
                    params._end = params._page * params._perPage;
                }
                delete params._page;
                delete params._perPage;
                // custom sort params
                if (params._sortField) {
                    params._sort = params._sortField;
                    delete params._sortField;
                }
                // custom filters
                if (params._filters) {
                    for (var filter in params._filters) {
                        params[filter] = params._filters[filter];
                    }
                    delete params._filters;
                }
            }
            console.log(params);
            return { params: params };
        });

        var admin = nga.application('RavenBot ') // application main title
            .baseApiUrl(domain+'/api/'); // main API endpoint

        // define all entities at the top to allow references between them
        var post = nga.entity('guilds'); // the API endpoint for posts will be http://localhost:3000/posts/:id

        // set the application entities
        admin
            .addEntity(post)
        // customize entities and views

        post.dashboardView() // customize the dashboard panel for this entity
            .title('Guilds')
            .order(1) // display the post panel first in the dashboard
            .perPage(5) // limit the panel to the 5 latest posts
            .fields([ nga.field('_id','string').isDetailLink(true),nga.field('name').map(truncate)]); // fields() called with arguments add fields to the view

        post.listView()
            .title('All Guilds') // default title is "[Entity_name] list"
            .description('List of Guilds with infinite pagination') // description appears under the title
            .infinitePagination(false) // load pages as the user scrolls
            .fields([
                nga.field('id','string'), // The default displayed name is the camelCase field name. label() overrides id
                nga.field('name'),
                 nga.field('players')// the default list field type is "string", and displays as a string
            ])
            .listActions(['show'])
            .perPage(20);


        post.showView() // a showView displays one entry in full page - allows to display more data than in a a list
            .title('Guild details')
            .fields([
                nga.field('_id'),
               nga.field('name'),
                nga.field('players', 'template')
                    .label('Players')
                    .template(function(entity){
                        var res=[];
                        _.each(entity.values.players,function(p){
                            res.push('<li>'+p._player+'</li>');
                        });
                        return '<ul>'+res.join('')+'</ul>';
                    })


            ]);


        admin.menu(nga.menu()
                .addChild(nga.menu(post).icon('<span class="glyphicon glyphicon-file"></span>')) // customize the entity menu icon

        );

        nga.configure(admin);
    });





    // custom 'send post by email' page

    function sendPostController($stateParams, notification) {
        this.postId = $stateParams.id;
        // notification is the service used to display notifications on the top of the screen
        this.notification = notification;
    };
    sendPostController.prototype.sendEmail = function() {
        if (this.email) {
            this.notification.log('Email successfully sent to ' + this.email, {addnCls: 'humane-flatty-success'});
        } else {
            this.notification.log('Email is undefined', {addnCls: 'humane-flatty-error'});
        }
    }
    sendPostController.inject = ['$stateParams', 'notification'];

    var sendPostControllerTemplate =
        '<div class="row"><div class="col-lg-12">' +
        '<ma-view-actions><ma-back-button></ma-back-button></ma-view-actions>' +
        '<div class="page-header">' +
        '<h1>Send post #{{ controller.postId }} by email</h1>' +
        '<p class="lead">You can add custom pages, too</p>' +
        '</div>' +
        '</div></div>' +
        '<div class="row">' +
        '<div class="col-lg-5"><input type="text" size="10" ng-model="controller.email" class="form-control" placeholder="name@example.com"/></div>' +
        '<div class="col-lg-5"><a class="btn btn-default" ng-click="controller.sendEmail()">Send</a></div>' +
        '</div>';

    app.config(function ($stateProvider) {
        $stateProvider.state('send-post', {
            parent: 'main',
            url: '/sendPost/:id',
            params: { id: null },
            controller: sendPostController,
            controllerAs: 'controller',
            template: sendPostControllerTemplate
        });
    });



}());
