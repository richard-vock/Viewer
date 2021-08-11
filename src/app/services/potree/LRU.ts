import {
  Injectable,
} from '@angular/core';

import { PotreeConfig } from './config';
import { OctreeNode } from './octree';

export class LRUItem{
  public previous? : LRUItem;
  public next? : LRUItem;

  constructor(public node : OctreeNode){
  }

}

@Injectable({
  providedIn: 'root',
})
export class LRU {
  private first? : LRUItem;
  private last? : LRUItem;
  private items : LRUItem[] = [];
  private elements : number = 0;
  private numPoints : number = 0;

  constructor(){
  }

  size(){
    return this.elements;
  }

  contains(node : OctreeNode){
    return this.items[node.getID()] == undefined;
  }

  touch(node : OctreeNode){
    if (!node.loaded) {
      return;
    }

    let item;
    if (!this.items[node.getID()]) {
      // add to list
      item = new LRUItem(node);
      item.previous = this.last;
      this.last = item;
      if (item.previous) {
        item.previous.next = item;
      }

      this.items[node.getID()] = item;
      this.elements++;

      if (!this.first) {
        this.first = item;
      }
      this.numPoints += node.numPoints;
    } else {
      // update in list
      item = this.items[node.getID()];
      if (!item.previous) {
        // handle touch on first element
        if (item.next) {
          this.first = item.next;
          if (this.first) {
            this.first.previous = undefined;
          }
          item.previous = this.last;
          item.next = undefined;
          this.last = item;
          (item.previous as LRUItem).next = item;
        }
      } else if (!item.next) {
        // handle touch on last element
      } else {
        // handle touch on any other element
        item.previous.next = item.next;
        item.next.previous = item.previous;
        item.previous = this.last;
        item.next = undefined;
        this.last = item;
        (item.previous as LRUItem).next = item;
      }
    }
  }

  remove(node : OctreeNode){
    let lruItem = this.items[node.getID()];
    if (lruItem) {
      if (this.elements === 1) {
        this.first = undefined;
        this.last = undefined;
      } else {
        if (!lruItem.previous) {
          this.first = lruItem.next;
          if (this.first) {
            this.first.previous = undefined;
          }
        }
        if (!lruItem.next) {
          this.last = lruItem.previous;
          if (this.last) {
            this.last.next = undefined;
          }
        }
        if (lruItem.previous && lruItem.next) {
          lruItem.previous.next = lruItem.next;
          lruItem.next.previous = lruItem.previous;
        }
      }

      delete this.items[node.getID()];
      this.elements--;
      this.numPoints -= node.numPoints;
    }
  }

  getLRUItem(){
    return this.first?.node;
  }

  toString(){
    let string = '{ ';
    let curr = this.first;
    while (curr) {
      string += curr.node.getID();
      if (curr.next) {
        string += ', ';
      }
      curr = curr.next;
    }
    string += '}';
    string += '(' + this.size() + ')';
    return string;
  }

  freeMemory(){
    if (this.elements <= 1) {
      return;
    }

    while (this.numPoints > PotreeConfig.pointLoadLimit) {
      // note that the exceeded point limit implies that this.first exists
      this.disposeDescendants(this.first?.node as OctreeNode);
    }
  }

  disposeDescendants(node : OctreeNode){
    let stack : OctreeNode[] = [];
    stack.push(node);
    while (stack.length > 0) {
      let current = stack.pop() as OctreeNode;

      current.dispose();
      this.remove(current);

      for (const child of current.getChildren()) {
        if (child.loaded) {
          stack.push(child);
        }
      }
    }
  }
}
