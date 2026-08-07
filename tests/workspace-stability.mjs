import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../js/workspace.js",import.meta.url),"utf8");
const observerQueue=new Set(),microtasks=[];

class ClassList{
  constructor(){this.values=new Set();}
  add(...names){names.forEach(name=>this.values.add(name));}
  remove(...names){names.forEach(name=>this.values.delete(name));}
  contains(name){return this.values.has(name);}
  toggle(name,force){const next=force===undefined?!this.values.has(name):!!force;if(next)this.values.add(name);else this.values.delete(name);return next;}
}

class TestObserver{
  constructor(callback){this.callback=callback;this.records=[];this.roots=new Set();}
  observe(root){this.roots.add(root);root.observers.add(this);}
  disconnect(){for(const root of this.roots)root.observers.delete(this);this.roots.clear();this.records=[];observerQueue.delete(this);}
  takeRecords(){const records=this.records.splice(0);return records;}
}

function notifyChildMutation(node){
  let current=node;
  while(current){for(const observer of current.observers){observer.records.push({type:"childList",target:node});observerQueue.add(observer);}current=current.parentNode;}
}

class Element{
  constructor(id="",tagName="div"){
    this.id=id;this.tagName=tagName.toUpperCase();this.dataset={};this.attributes={};this.classList=new ClassList();
    this.children=[];this.parentNode=null;this.observers=new Set();this.listeners={};this.hidden=false;this.inert=false;this.open=false;this._text="";
  }
  get className(){return [...this.classList.values].join(" ");}
  set className(value){this.classList.values=new Set(String(value||"").split(/\s+/).filter(Boolean));}
  get textContent(){return this._text;}
  set textContent(value){this._text=String(value??"");notifyChildMutation(this);}
  set innerHTML(value){this._html=String(value??"");notifyChildMutation(this);}
  get innerHTML(){return this._html||"";}
  appendChild(child){child.parentNode=this;this.children.push(child);notifyChildMutation(this);return child;}
  addEventListener(type,handler){(this.listeners[type]||(this.listeners[type]=[])).push(handler);}
  setAttribute(name,value){this.attributes[name]=String(value);}
  removeAttribute(name){delete this.attributes[name];if(name==="open")this.open=false;}
  hasAttribute(name){return this.attributes[name]!==undefined;}
  focus(){}
  scrollIntoView(){}
  querySelector(selector){
    if(selector===".workspace-card-toggle")return this.children.find(child=>child.classList.contains("workspace-card-toggle"))||null;
    if(selector.startsWith("h3,"))return this.heading||null;
    return null;
  }
  querySelectorAll(selector){
    if(selector.startsWith(":scope > .slot"))return this.cards||[];
    if(selector==="details.card-detail-block, details.agency-contract")return this.details||[];
    if(selector===".log-entry")return [];
    if(selector==="[data-entity-key]")return [];
    return [];
  }
  closest(selector){
    let current=this;
    while(current){
      if(selector==='[role="tab"][data-workspace-view]'&&current.attributes.role==="tab"&&current.dataset.workspaceView!==undefined)return current;
      if(selector==='[role="tab"][data-side-view]'&&current.attributes.role==="tab"&&current.dataset.sideView!==undefined)return current;
      if(selector==="[data-workspace-view]"&&current.dataset.workspaceView!==undefined)return current;
      if(selector==="[data-side-view]"&&current.dataset.sideView!==undefined)return current;
      if(selector==="[data-entity-key]"&&current.dataset.entityKey!==undefined)return current;
      if(selector==="[data-workspace-inspect]"&&current.dataset.workspaceInspect!==undefined)return current;
      current=current.parentNode;
    }
    return null;
  }
}

const elements={};
for(const id of ["gameCockpit","workspaceMain","workspaceSide","workspaceEntityNav","workspaceTrail","workspaceNavNote","runNextButton","slots","log","accountBox","accountDrawer","pipeDrawer"])
  elements[id]=new Element(id);
const card=new Element("card","article"),heading=new Element("heading","h3"),detail=new Element("detail","details");
heading.textContent="Test creative";detail.classList.add("card-detail-block");detail.open=true;detail.attributes.open="";
card.heading=heading;card.details=[detail];card.dataset.clientId="client-loop-regression";
elements.workspaceMain.parentNode=elements.gameCockpit;elements.workspaceSide.parentNode=elements.gameCockpit;
elements.slots.parentNode=elements.workspaceMain;elements.log.parentNode=elements.workspaceSide;elements.accountBox.parentNode=elements.workspaceSide;
elements.slots.cards=[card];card.parentNode=elements.slots;detail.parentNode=card;
const activity=new Element("activity","button"),systems=new Element("systems","button");
for(const [node,view] of [[activity,"activity"],[systems,"systems"]]){node.attributes.role="tab";node.dataset.sideView=view;node.parentNode=elements.workspaceSide;}
const workspaceTabs=["overview","board","finance","team","growth","history"].map(view=>{const node=new Element(`${view}-tab`,"button");node.attributes.role="tab";node.dataset.workspaceView=view;node.parentNode=elements.gameCockpit;return node;}),
  [overviewTab,boardTab]=workspaceTabs,sideTabs=[activity,systems];

const document={
  body:new Element("body","body"),
  readyState:"complete",
  getElementById:id=>elements[id]||null,
  createElement:tag=>new Element("",tag),
  addEventListener(){},
  querySelector(selector){if(selector==='[data-side-view="activity"]')return activity;if(selector==='[data-side-view="systems"]')return systems;return null;},
  querySelectorAll(selector){if(selector==='[role="tab"][data-workspace-view]')return workspaceTabs;
    if(selector==='[role="tab"][data-side-view]')return sideTabs;if(selector==="[data-side-panel]")return [];return [];}
};
const sessionStorage={values:new Map(),getItem(key){return this.values.get(key)??null;},setItem(key,value){this.values.set(key,String(value));}};
const context=vm.createContext({document,sessionStorage,MutationObserver:TestObserver,densityLevel:()=>"analyst",
  queueMicrotask:callback=>microtasks.push(callback)});
vm.runInContext(source,context,{filename:"js/workspace.js"});

function flush(limit=25){
  let passes=0;
  while(observerQueue.size||microtasks.length){
    assert(passes++<limit,"workspace observer did not settle");
    const observers=[...observerQueue];observerQueue.clear();
    for(const observer of observers){const records=observer.takeRecords();if(records.length)observer.callback(records,observer);}
    while(microtasks.length)microtasks.shift()();
  }
  return passes;
}

flush();
assert.equal(card.children.filter(child=>child.classList.contains("workspace-card-toggle")).length,1);
assert.equal(card.querySelector(".workspace-card-toggle").textContent,"Inspect");
assert.equal(card.dataset.workspaceKey,"entity:client-loop-regression","client identity did not produce a stable workspace key");
assert.equal(detail.open,false,"analyst density forced a client disclosure open");

// A real game render mutates a card under #slots. The presentation observer must settle after
// decorating the new state instead of observing and rewriting its own controls forever.
card.appendChild(new Element("engine-update","span"));
assert(flush()<10,"one engine render caused repeated workspace synchronization");

for(let index=0;index<50;index++)vm.runInContext("Workspace.sync()",context);
assert(flush()<10,"repeated sync requests did not coalesce");
assert.equal(card.children.filter(child=>child.classList.contains("workspace-card-toggle")).length,1);
assert.equal(card.dataset.workspaceKey,"entity:client-loop-regression","observer synchronization replaced the stable client key");

const workspaceClick=elements.gameCockpit.listeners.click[0];assert.equal(typeof workspaceClick,"function","workspace click delegation was not installed");
workspaceClick({target:card.querySelector(".workspace-card-toggle")});flush();
assert.equal(card.querySelector(".workspace-card-toggle").textContent,"Back to all");
assert.equal(elements.gameCockpit.attributes["aria-selected"],undefined,"the cockpit container was treated as a tab");
workspaceClick({target:card.querySelector(".workspace-card-toggle")});flush();
assert.equal(card.querySelector(".workspace-card-toggle").textContent,"Inspect");

workspaceClick({target:boardTab});flush();
assert.equal(elements.gameCockpit.dataset.workspaceView,"board");
assert.equal(boardTab.attributes["aria-selected"],"true");
