# promise-deferred-rejection

_Performance note: Creates an internal promise and attaches to it with `then`. This triples the number of promises your code creates._

Experimental promises with deferred rejection.

Use to create a promise or batch of promises whose rejection is deferred until you say. This enables asynchronous attachment of handlers without unhandled rejection events.

No need to catch global unhandled rejection events or change the global unhandled rejection behavior. And you can still deliver any unhandled rejections after your asynchronous process is complete so you don't swallow errors.

Makes it the responsibility of the programmer to specify when a rejection should be considered unhandled.

Use a batch when you need to end deferral of a set of promises at a particular time. All derived promises will have rejection deferred and be in the same batch. Ending deferral of a batch ends deferral on all contained promises.

Behavior details:
* Adding a rejection handler ends deferral immediately.
* Derives standard promises. Too easy to swallow rejections otherwise.
* Batch creates promises that derive new deferred rejection promises in the same batch.

## Examples

Require like this:
```javascript
const { PromiseDeferredRejection, PromiseDeferredRejectionBatch } =
      require('./promise-deferred-rejection');
```

General usage pattern:
```javascript
let resolve, reject;
const promise = new PromiseDeferredRejection((res,rej)=>{
  resolve = res;
  reject = rej;
});
// .. start asynchronous process that will attach handlers
reject('Rejected!'); // No unhandled rejection
// .. asynchronously end deferral after process ends
```

End deferral asynchronously:
```javascript
let resolve, reject;
const promise = new PromiseDeferredRejection((res,rej)=>{
  resolve = res;
  reject = rej;
});
reject('Rejected!'); // No unhandled rejection
setTimeout(()=>{
  promise.release();
},5000); // End deferral 5 seconds later, unhandled rejection delivered
```

Handle rejection asynchronously:
```javascript
let resolve, reject;
const promise = new PromiseDeferredRejection((res,rej)=>{
  resolve = res;
  reject = rej;
});
reject('Rejected!'); // No unhandled rejection
setTimeout(()=>{
  promise.catch(reason=>{
    console.log('Handling rejection with reason: '+reason);
  });
},5000); // Rejection handled 5 seconds later
setTimeout(()=>{
  promise.release();
},8000); // Always end deferral in case normal process fails
```

End deferral for a batch of promises at once:
```javascript
const batch = new PromiseDeferredRejectionBatch;
let resolve1, reject1;
const promise1 = batch.create((res,rej)=>{
  resolve1 = res;
  reject1 = rej;
});
setTimeout(()=>{ // All derived promises have rejection deferred
  const promise2 = promise1.then(value=>{
    console.log('promise1 fulfilled');
  });
  const promise3 = promise2.then(value=>{
    console.log('promise2 fulfilled');
  });
  reject1('Rejected!'); // Rejection lands in promise3 and is deferred
},3000);
setTimeout(()=>{
  batch.release();
},8000); // End deferral of whole batch, delivers unhandled rejection from promise3
```