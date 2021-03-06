var operations = (function(exports){
  "use strict";
  var environments = require('./environments'),
      operators    = require('./operators'),
      descriptors  = require('./descriptors'),
      objects      = require('../lib/objects'),
      iteration    = require('../lib/iteration'),
      errors       = require('../errors'),
      constants    = require('../constants'),
      MapData      = require('./collections').MapData;

  var BRANDS = constants.BRANDS,
      is                     = objects.is,
      create                 = objects.create,
      define                 = objects.define,
      inherit                = objects.inherit,
      each                   = iteration.each,
      $$ThrowException       = errors.$$ThrowException,
      AbruptCompletion       = errors.AbruptCompletion,
      $$ToPropertyKey        = operators.$$ToPropertyKey,
      $$GetThisValue         = operators.$$GetThisValue,
      $$ToUint32             = operators.$$ToUint32,
      $$ToObject             = operators.$$ToObject,
      $$IsDataDescriptor     = descriptors.$$IsDataDescriptor,
      $$IsAccessorDescriptor = descriptors.$$IsAccessorDescriptor,
      $$IsGenericDescriptor  = descriptors.$$IsGenericDescriptor,
      $$IsEmptyDescriptor    = descriptors.$$IsEmptyDescriptor,
      Accessor               = descriptors.Accessor,
      DataDescriptor         = descriptors.DataDescriptor,
      AccessorDescriptor     = descriptors.AccessorDescriptor;

  var E = 0x1,
      C = 0x2,
      W = 0x4,
      A = 0x8,
      ___ = 0,
      E__ = 1,
      _C_ = 2,
      EC_ = 3,
      __W = 4,
      E_W = 5,
      _CW = 6,
      ECW = 7,
      __A = 8,
      E_A = 9,
      _CA = 10,
      ECA = 11;



  function $Object(o){
    $Object = require('./$Object').$Object;
    return new $Object(o);
  }

  function $Array(o){
    $Array = require('./$Array');
    return new $Array(o);
  }


  var Reference = exports.Reference = (function(){
    function Reference(base, name, strict){
      this.base = base;
      this.name = name;
      this.strict = !!strict;
    }
    define(Reference.prototype, {
      Reference: constants.SYMBOLS.Reference
    });


    define(environments.EnvironmentRecord.prototype, [
      function reference(key, strict){
        return new Reference(this, key, strict);
      }
    ]);

    return Reference;
  })();


  function $$CheckObjectCoercible(argument){
    if (argument === null) {
      return $$ThrowException('null_to_object');
    } else if (argument === undefined) {
      return $$ThrowException('undefined_to_object');
    }
    return argument;
  }

  exports.$$CheckObjectCoercible = $$CheckObjectCoercible;


  function $$IsArrayIndex(argument) {
    var n = argument >>> 0;
    return ''+n === argument && n !== 0xffffffff;
  }

  exports.$$IsArrayIndex = $$IsArrayIndex;


  function $$IsPropertyReference(v){
    var type = typeof v.base;
    return v !== null
        && type === 'string' || type === 'number' || type === 'boolean'
        || type === 'object' && 'GetP' in v.base;
  }

  exports.$$IsPropertyReference = $$IsPropertyReference;


  function $$GetIdentifierReference(lex, name, strict){
    if (lex == null) {
      return new Reference(undefined, name, strict);
    } else if (lex.HasBinding(name)) {
      return new Reference(lex, name, strict);
    } else {
      return $$GetIdentifierReference(lex.outer, name, strict);
    }
  }

  exports.$$GetIdentifierReference = $$GetIdentifierReference;


  function $$GetSymbol(context, name){
    var env = context.LexicalEnvironment;
    while (env) {
      if (env.HasSymbolBinding(name)) {
        return env.GetSymbol(name);
      }
      env = env.outer;
    }
  }

  exports.$$GetSymbol = $$GetSymbol;


  function $$Element(context, prop, base){
    var result = $$CheckObjectCoercible(base);
    if (result.Abrupt) return result;

    var name = $$ToPropertyKey(prop);
    if (name && name.Abrupt) return name;
    return new Reference(base, name, context.strict);
  }

  exports.$$Element = $$Element;


  function $$SuperReference(context, prop){
    var env = $$GetThisEnvironment(context);
    if (!env.HasSuperBinding()) {
      return $$ThrowException('invalid_super_binding');
    } else if (prop === null) {
      return env;
    }

    var baseValue = env.GetSuperBase(),
        status = $$CheckObjectCoercible(baseValue);

    if (status.Abrupt) return status;

    if (prop === false) {
      var key = env.GetMethodName();
    } else {
      var key = $$ToPropertyKey(prop);
      if (key && key.Abrupt) return key;
    }

    var ref = new Reference(baseValue, key, context.strict);
    ref.thisValue = env.GetThisBinding();
    return ref;
  }

  exports.$$SuperReference = $$SuperReference;


  function $$GetThisEnvironment(context){
    var env = context.LexicalEnvironment;
    while (env) {
      if (env.HasThisBinding())
        return env;
      env = env.outer;
    }
  }

  exports.$$GetThisEnvironment = $$GetThisEnvironment;


  function $$ThisResolution(context){
    return $$GetThisEnvironment(context).GetThisBinding();
  }

  exports.$$ThisResolution = $$ThisResolution;


  function $$IdentifierResolution(context, name) {
    return $$GetIdentifierReference(context.LexicalEnvironment, name, context.strict);
  }

  exports.$$IdentifierResolution = $$IdentifierResolution;


  function $$IsCallable(argument){
    if (argument && argument.Abrupt) return argument;
    return argument && typeof argument === 'object' ? 'Call' in argument : false;
  }

  exports.$$IsCallable = $$IsCallable;


  function $$IsConstructor(argument){
    if (argument && argument.Abrupt) return argument;
    return argument && typeof argument === 'object' ? 'Construct' in argument : false;
  }

  exports.$$IsConstructor = $$IsConstructor;


  function $$EvaluateConstruct(func, args) {
    if (typeof func !== 'object') {
      return $$ThrowException('not_constructor', func);
    }

    if ($$IsConstructor(func)) {
      return func.Construct(args);
    } else {
      return $$ThrowException('not_constructor', func);
    }
  }

  exports.$$EvaluateConstruct = $$EvaluateConstruct;


  function $$EvaluateCall(ref, func, args, tail){
    if (typeof func !== 'object' || !$$IsCallable(func)) {
      return $$ThrowException('called_non_callable', [ref && ref.name]);
    }

    if (ref instanceof Reference) {
      var receiver = $$IsPropertyReference(ref) ? $$GetThisValue(ref) : ref.base.WithBaseObject();
    }

    // if (tail) {
    //   var leafContext = context;
    //   leafContext.pop();
    // }

    return func.Call(receiver, args);
  }

  exports.$$EvaluateCall = $$EvaluateCall;


  var emptyArgs = [];

  function $$Invoke(receiver, key, args){
    var object = $$ToObject(receiver);
    if (object && object.Abrupt) return object;

    var func = $$GetMethod(object, key);
    if (func && func.Abrupt) return func;

    if (func === undefined) {
      return $$ThrowException('property_not_function', [key, object.BuiltinBrand]);
    }

    return func.Call(receiver, args || emptyArgs);
  }

  exports.$$Invoke = $$Invoke;


  function $$OrdinaryHasInstance(callable, object){
    if (!$$IsCallable(callable)) {
      return false;
    }

    if (callable.BoundTargetFunction) {
      return callable.BoundTargetFunction.HasInstance(object);
    }

    if (typeof object !== 'object' || object === null) {
      return false;
    }

    var prototype = callable.Get('prototype');
    if (prototype.Abrupt) return prototype;

    if (typeof prototype !== 'object') {
      return $$ThrowException('instanceof_nonobject_proto');
    }

    while (object) {
      object = object.GetInheritance();
      if (prototype === object) {
        return true;
      }
    }
    return false;
  }

  exports.$$OrdinaryHasInstance = $$OrdinaryHasInstance;


  function $$SpreadArguments(precedingArgs, spread){
    if (typeof spread !== 'object') {
      return $$ThrowException('spread_non_object');
    }

    var offset = precedingArgs.length,
        len = $$ToUint32(spread.Get('length'));

    if (len && len.Abrupt) return len;

    for (var i=0; i < len; i++) {
      var value = spread.Get(i);
      if (value && value.Abrupt) return value;
      precedingArgs[i + offset] = value;
    }
  }

  exports.$$SpreadArguments = $$SpreadArguments;


  function $$SpreadInitialization(array, offset, spread){
    var obj = $$ToObject(spread);
    if (obj && obj.Abrupt) return obj;

    var len = $$ToUint32(obj.Get('length'));
    if (len && len.Abrupt) return len;

    for (var i = offset; i < len; i++) {
      var value = obj.Get(i);
      if (value && value.Abrupt) return value;
      array.set(offset++ + '', value);
    }

    array.define('length', offset, _CW);
    return offset;
  }

  exports.$$SpreadInitialization = $$SpreadInitialization;


  function $$SpreadDestructuring(context, target, index){
    var array = new $Array(0);
    if (target == null) {
      return array;
    }
    if (typeof target !== 'object') {
      return $$ThrowException('spread_non_object', typeof target);
    }

    var len = $$ToUint32(target.Get('length'));
    if (len && len.Abrupt) return len;

    var count = len - index;
    for (var i=0; i < count; i++) {
      var value = target.Get(index + i);
      if (value && value.Abrupt) return value;
      array.set(i+'', value);
    }

    array.define('length', i, _CW);
    return array;
  }

  exports.$$SpreadDestructuring = $$SpreadDestructuring;


  function $$GetTemplateCallSite(context, template){
    if (!('id' in template)) {
      $$GetTemplateCallSite.count = ($$GetTemplateCallSite.count || 0) + 1;
      template.id = $$GetTemplateCallSite.count;
    }
    if (template.id in realm.templates) {
      return context.Realm.templates[template.id];
    }

    var count = template.length,
        site = new $Array(count),
        raw = new $Array(count);

    for (var i=0; i < count; i++) {
      site.define(i+'', template[i].cooked, E__);
      raw.define(i+'', template[i].raw, E__);
    }

    site.define('length', count, ___);
    raw.define('length', count, ___);
    site.define('raw', raw, ___);
    site.PreventExtensions(false);
    raw.PreventExtensions(false);
    realm.templates[template.id] = site;
    return site;
  }

  exports.$$GetTemplateCallSite = $$GetTemplateCallSite;


  function $$EnqueueChangeRecord(record, changeObservers){
    changeObservers.forEach(function(callback){
      var changeRecords = callback.PendingChangeRecords || (callback.PendingChangeRecords = []);
      changeRecords.push(record);
    });
  }

  exports.$$EnqueueChangeRecord = $$EnqueueChangeRecord;


  function $$CreateChangeRecord(type, object, name, oldDesc){
    var changeRecord = new $Object;
    changeRecord.define('type', type, E__);
    changeRecord.define('object', object, E__);
    if (name !== null) {
      changeRecord.define('name', name, E__);
    }
    if ($$IsDataDescriptor(oldDesc)) {
      changeRecord.define('oldValue', oldDesc.Value, E__);
    }
    changeRecord.PreventExtensions();
    return changeRecord;
  }

  exports.$$CreateChangeRecord = $$CreateChangeRecord;


  function $$DeliverChangeRecords(callback){
    var changeRecords = callback.PendingChangeRecords;
    if (changeRecords && changeRecords.length) {
      callback.PendingChangeRecords = [];
      var result = callback.Call(undefined, [new $Array(changeRecords)]);
      if (result && result.Abrupt) return result;
      return true;
    }
    return false;
  }

  exports.$$DeliverChangeRecords = $$DeliverChangeRecords;


  function $$DeliverAllChangeRecords(realm){
    var anyWorkDone = false,
        callbacks = intrinsics.ObserverCallbacks,
        errors = [];

    if (callbacks && callbacks.size) {
      callbacks.forEach(function(callback){
        var result = $$DeliverChangeRecords(callback);
        if (result) {
          anyWorkDone = true;
          if (result.Abrupt) {
            errors.push(result);
          }
        }
      });
    }

    return errors.length ? errors : anyWorkDone;
  }

  exports.$$DeliverAllChangeRecords = $$DeliverAllChangeRecords;


  function $$GetNotifier(object){
    var notifier = object.Notifier;
    if (!notifier) {
      notifier = object.Notifier = new $Object(intrinsics.NotifierProto);
      notifier.Target = object;
      notifier.ChangeObservers = new MapData;
    }
    return notifier;
  }

  exports.$$GetNotifier = $$GetNotifier;


  function $$ThrowStopIteration(){
    return new AbruptCompletion('throw', intrinsics.StopIteration);
  }

  exports.$$ThrowStopIteration = $$ThrowStopIteration;


  function $$IsStopIteration(o){
    return !!(o && o.Abrupt && o.value && o.value.BuiltinBrand === BRANDS.StopIteration);
  }

  exports.$$IsStopIteration = $$IsStopIteration;


  function $$GetKey(context, value){
    if (!value || typeof value === 'string') {
      return value;
    }
    return value[0] !== '@' ? value[1] : context.getSymbol(value[1]);
  }

  exports.$$GetKey = $$GetKey;


  function $$CreateListFromArray($array){
    if ($array.array) {
      return $array.array;
    }
    var array = [],
        len = $array.get('length');

    for (var i=0; i < len; i++) {
      array[i] = $array.get(i+'');
    }
    return array;
  }

  exports.$$CreateListFromArray = $$CreateListFromArray;


  function $$CreateArrayFromList(elements){
    return new $Array(elements.slice());
  }

  exports.$$CreateArrayFromList = $$CreateArrayFromList;



  var realm, intrinsics;

  exports.changeRealm = function changeRealm(newRealm){
    realm = newRealm;
    intrinsics = realm ? realm.intrinsics : undefined;
  };

  return exports;
})(typeof module !== 'undefined' ? exports : {});
