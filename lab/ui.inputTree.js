angular.module('ui.inputTree', [])
    .directive('uiInputTree', ['$templateCache', '$compile','$timeout', function ($templateCache, $compile,$timeout) {
        var popupCtrl=(function(){
            function popupCtrl(compile,templateCache,timeout){
                this.templateCache=templateCache;
                this.compile=compile;
                this.timeout=timeout;
            }
            popupCtrl.prototype={
                setupScope:function(scope,elem){
                    this.scope=scope;
                    this.elem=elem;
                    this.getTpl(this.scope);
                    this.addEvent(elem);
                },
                getTpl:function(scope){
                    var self=this;
                    if (!scope.tpl){
                        scope.tpl=self.compile(['<div class="ui-input-tree-popup" ng-show="isOpen"><span class="ui-input-close" ng-click="onClose()">×</span>'
                            ,self.templateCache.get('templates/input-tree-popup.html'),'</div>'].join(''))(self.scope);
                        if(scope.width){
                            scope.tpl.css({width:parseInt(scope.width,10)+'px'});
                        }
                        $('body').append(scope.tpl);
                        if(!scope.visible){
                            self.show();
                        }else{
                            self.hide();
                        }
                    }
                },
                addEvent:function(elem){
                    elem.on(this.scope.triggerType||'click',_.bind(this.onTriggerEvt,this));
                    $(document).on('click',_.bind(this.layerCtrl,this));
                },
                layerCtrl:function(c){
                    var elem=this.elem[0];
                    c = c || window.event;
                    for (var d = c.target || c.srcElement; d && d.nodeType === 1;) {
                        if ((d===elem)|| String(d.className).hasString('ui-input-tree-popup')){
                            ui.evt(c).stop();
                            return
                        }
                        d = d.parentNode
                    }
                    this.hide();
                },
                onTriggerEvt:function(evt){
                    this.toggle(!!this.visible);
                },
                offset:function(){
                    var offset=this.elem.offset();
                    var height=this.elem[0].offsetHeight;
                    return {
                        left:offset.left+'px',
                        top:(offset.top+height)+'px'
                    }
                },
                toggle:function(visible){
                    visible?this.hide():this.show();
                },
                hide:function(){
                    this.scope.tpl.css({'left':'-9999em','top':'-9999em'});
                    this.visible=0;
                },
                show:function(){
                    var a=this.offset();
                    this.scope.tpl.css({'left':a.left,'top':a.top,'width':this.elem.outerWidth()});
                    this.visible=1;
                },
                destroy:function(){
                    $(document).off('click',_.bind(this.layerCtrl,this));
                }
            };
            return popupCtrl;
        })();
        var _opts=['key','asValue','width','isOpen'];
        return{
            restrict: 'A',
            require:['uiInputTree','?ngModel'],
            scope: {
                data:'=',
                ngModel:'=',
                selectNode:'=?',
                options:'=?',
                onSelect:'&'
            },
            controller:["$compile","$templateCache", "$timeout",popupCtrl],
            compile: function () {
                return{
                    pre: function (scope, elem,attr,ctrl) {
                        if (elem.children().length === 0) {
                            scope.options= _.extend({
                                nodeChildren:"children",
                                dirSelectable:false
                            },scope.options||{});
                            elem.append($compile($templateCache.get('templates/input-tree.html'))(scope));
                        }
                        ctrl[0].setupScope(scope,elem);
                    },
                    post: function (scope, elem, attr,ctrl){
                        var op=scope.options;
                        for (var i = 0, l = _opts.length; i < l; i++) {
                            var opt = _opts[i];
                            if (attr[opt]) {
                                scope[opt] =attr[opt];
                            }
                        }
                        var input=elem.find('input');
                        (function(){
                            elem.on('click',function(){
                                input.focus();
                                ctrl[0].show();
                                scope.isOpen=1;
                                scope.$apply();
                            });
                        })();
                        scope.onClose=function(){
                            ctrl[0].hide();
                        };
                        scope.del=function(evt){
                            ui.evt(evt).stop();
                            scope.ngModel='';
                            scope._ngModel='';
                            input.focus();
                            ctrl[0].show();
                            scope.isOpen=1;
                            scope.selectNode={};//清空选中数据
                        };
                        //阻止输入
                        scope.onKeydown=function(evt){
                            //防止回车触发document click事件 导致浮动框关闭
                            ui.evt(evt).prevent();
                        };
                        scope._onSelect=function(node){
                            scope.isEm=1;
                            if(node[op.nodeChildren] && node[op.nodeChildren].length){
                                scope.selectNode={};//清空选中数据
                                return;
                            }
                            ctrl[1].$setViewValue(scope.asValue ? node[scope.asValue] : node);
                            scope._ngModel=node[scope.key];
                            ctrl[0].hide();
                            if(scope.onSelect){
                                scope.onSelect({node:node});
                            }
                        };
                        var wa=scope.$watch('ngModel',function(a){
                            if(!_.isUndefined(a) && a!==''){
                                if(scope.asValue && !scope.isEm){
                                    scope.selectNode=function(){
                                        var d=angular.copy(scope.data);
                                        var obj={};
                                        var emu=function(d){
                                            for(var i in d){
                                                if(d.hasOwnProperty(i)){
                                                    if(d[i]==a){
                                                        obj=d;
                                                    }else{
                                                        if(_.isObject(d[i])){
                                                            emu(d[i]);
                                                        }
                                                    }
                                                }
                                            }
                                        };
                                        emu(d);
                                        return obj
                                    }();
                                    scope._ngModel=scope.selectNode[scope.key];
                                    scope.isEm=1
                                }
                            }else{
                                scope._ngModel='';
                                scope.selectNode={};
                            }
                        },true);
                    }
                }
            }
        }
    }])
    .run(["$templateCache", function ($templateCache) {
        $templateCache.put("templates/input-tree.html",
            '<input class="ui-input" type="text" ng-model="_ngModel" ng-keydown="onKeydown($event)" />\
             <span class="glyphicon glyphicon-search" ng-if="!_ngModel"></span>\
             <span class="glyphicon glyphicon-remove" ng-if="_ngModel" ng-click="del($event)"></span>\
            ');
        $templateCache.put("templates/input-tree-popup.html",
            '<div  ui-tree class="ui-tree tree-classic" options="options"  tree-model="data" selected-node="selectNode" on-selection="_onSelect(node)">\
                {{node[key]}}\
            </div>');
    }]);