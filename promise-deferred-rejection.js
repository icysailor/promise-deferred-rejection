/**
 * Promise with deferred rejection.
 * @module
 */

/** Private data repository. */
const privr = new WeakMap;
  
/**
  * Internal promise was rejected.
  * If deferral has already ended, deliver immediately.
  * Otherwise, save rejection reason and defer for later delivery.
  */
function onRejected (reason) {
  const priv = privr.get(this);
  if (!priv.defer) return priv.reject(reason);
  priv.deferred = true;
  priv.reason = reason;
}

/** Promise with deferred rejection. */
class PromiseDeferredRejection extends Promise {
  
  /**
    * Creates internal promise for complete standard functionality.
    * Passes through internal promise fulfillment unconditionally.
    * Intercepts internal promise rejection and defers or delivers conditionally.
    */
  constructor (executor) {
    const priv = {
      defer: true,
      deferred: false,
      reason: undefined,
      reject: null
    };
    let resolve;
    super((res,rej)=>{
      resolve = res;
      priv.reject = rej;
    });
    privr.set(this,priv);
    let internalResolve, internalReject;
    const internalPromise = new Promise((res,rej)=>{
      internalResolve = res;
      internalReject = rej;
    });
    internalPromise.then(
      resolve,
      onRejected.bind(this)
    );
    executor(internalResolve,internalReject);
  }
  
  /** Ends deferral on first rejection reaction. */
  then (onFulfilled, onRejected) {
    const priv = privr.get(this);
    if (!priv.defer) return super.then (onFulfilled, onRejected);
    const result = super.then (onFulfilled, onRejected);
    if (typeof onRejected === 'function') this.release();
    return result;
  }
  
  /** Ends deferral. Delivers deferred rejection if pending. */
  release () {
    const priv = privr.get(this);
    if (!priv.defer) return;
    priv.defer = false;
    if (priv.deferred) {
      const reason = priv.reason;
      priv.deferred = false;
      priv.reason = undefined;
      priv.reject(reason);
    }
  }
  
  /** Derive standard promises. Too easy to swallow rejections otherwise. */
  static get [Symbol.species] () { return Promise; }
  
}

/** Batch of promises with centralized deferral ending. */
class PromiseDeferredRejectionBatch {
  
  constructor () {
    const priv = {
      promises: new Set,
      defer: true
    };
    privr.set(this,priv);
    
    /** Batch subclass. Ensures all derived promises are in the batch. */
    priv.constructor = class extends PromiseDeferredRejection {
      constructor (executor) {
        super(executor);
        if(priv.defer) priv.promises.add(this);
        else this.release();
      }
      static get [Symbol.species] () { return priv.constructor; }
    }
    
  }
  
  create (executor) {
    const priv = privr.get(this);
    return new priv.constructor(executor);
  }
  
  release () {
    const priv = privr.get(this);
    if (!priv.defer) return;
    priv.defer = false;
    const promises = priv.promises;
    { let promise; for (promise of promises) {
      promise.release();
    }}
    priv.promises = null;
  }
  
}

module.exports = {
  PromiseDeferredRejection,
  PromiseDeferredRejectionBatch
};