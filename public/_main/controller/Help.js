Ext.define('PumaMain.controller.Help', {
    extend: 'Ext.app.Controller',
    views: [],
    requires: [],
    init: function() {
        this.control(
                {
                    '#contexthelp': {
                        toggle: this.onContextHelpToggle
                    }
                })
            Ext.createListenerWrap = this.createListenerWrap

    },
        
    onContextHelpToggle: function(cmp, pressed) {
        var els = Ext.select('*');
        debugger;
        if (pressed) {
           
            els.on('mousedown', this.onHelpClick, this, {
                stopEvent: true
            });
            Config.contextHelpFn = this.onHelpClick
        }
        else {
            els.un('mousedown', this.onHelpClick, this);
            Config.contextHelpFn = null;
        }
    },
        
    onHelpClick: function(e,dom) {
        var el = Ext.get(dom);
        var helpId = null;
        var cmp = null;
        while (!helpId && el) {
            cmp = Ext.getCmp(el.id);
            if (cmp) {
                if (cmp.itemId=='contexthelp') {
                    cmp.toggle(false);
                    return;
                }    
                else if (cmp.helpId) {
                    helpId = cmp.helpId;
                    break;
                }
                else {
                    var helpCmp = Ext.ComponentQuery.query('component[helpId]',cmp)[0];
                    if (helpCmp) {
                        helpId = helpCmp.helpId;
                        break;
                    }
                }
            }
            el = el.up('');
        }
        if (helpId) {
            //window.open('help/'+helpId+'.html', "_blank")
        }
        else {
            //window.open('help/PUMA webtool help.html', "_blank")
        }
    },
        
    createListenerWrap : function(dom, ename, fn, scope, options) {
            options = options || {};
            debugger;
            var f, gen, escapeRx = /\\/g, wrap = function(e, args) {
                
                if (Config && Config.contextHelpFn && fn!=Config.contextHelpFn) {
                    debugger;
                }
                
                
                if (!gen) {
                    f = ['if(!' + Ext.name + ') {return;}'];

                    if(options.buffer || options.delay || options.freezeEvent) {
                        if (options.freezeEvent) {
                            
                            
                            f.push('e = X.EventObject.setEvent(e);');
                        }
                        f.push('e = new X.EventObjectImpl(e, ' + (options.freezeEvent ? 'true' : 'false' ) + ');');
                    } else {
                        f.push('e = X.EventObject.setEvent(e);');
                    }

                    if (options.delegate) {
                        
                        
                        f.push('var result, t = e.getTarget("' + (options.delegate + '').replace(escapeRx, '\\\\') + '", this);');
                        f.push('if(!t) {return;}');
                    } else {
                        f.push('var t = e.target, result;');
                    }

                    if (options.target) {
                        f.push('if(e.target !== options.target) {return;}');
                    }

                    if(options.stopEvent) {
                        f.push('e.stopEvent();');
                    } else {
                        if(options.preventDefault) {
                            f.push('e.preventDefault();');
                        }
                        if(options.stopPropagation) {
                            f.push('e.stopPropagation();');
                        }
                    }

                    if(options.normalized === false) {
                        f.push('e = e.browserEvent;');
                    }

                    if(options.buffer) {
                        f.push('(wrap.task && clearTimeout(wrap.task));');
                        f.push('wrap.task = setTimeout(function() {');
                    }

                    if(options.delay) {
                        f.push('wrap.tasks = wrap.tasks || [];');
                        f.push('wrap.tasks.push(setTimeout(function() {');
                    }

                    
                    f.push('result = fn.call(scope || dom, e, t, options);');

                    if(options.single) {
                        f.push('evtMgr.removeListener(dom, ename, fn, scope);');
                    }

                    
                    
                    if (ename !== 'mousemove' && ename !== 'unload') {
                        f.push('if (evtMgr.idleEvent.listeners.length) {');
                        f.push('evtMgr.idleEvent.fire();');
                        f.push('}');
                    }

                    if(options.delay) {
                        f.push('}, ' + options.delay + '));');
                    }

                    if(options.buffer) {
                        f.push('}, ' + options.buffer + ');');
                    }
                    f.push('return result;')

                    gen = Ext.cacheableFunctionFactory('e', 'options', 'fn', 'scope', 'ename', 'dom', 'wrap', 'args', 'X', 'evtMgr', f.join('\n'));
                }
                
                debugger;
                return gen.call(dom, e, options, fn, scope, ename, dom, wrap, args, Ext, EventManager);
            };
            return wrap;
        },
    
});


