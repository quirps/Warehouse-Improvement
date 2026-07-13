# Warehouse Improvement Proposal - Put Away

Swedemom's warehouse contains thousands of items contained in hundreds of **storage slots**, most of which are at max capacity. Currently, storage slots (bins that store items labelled with a 2-character alphanumerical ID) don't contain any capacity or spatial information, which makes stowing away items tedious. A further constraint is that certain items have implicit storage types, as they either compact well when placed in the same bins or for other reasons (breakables, big items, small items), yet this information doesn't explicitly exist, or is not yet integrated.

Currently, a user performing the Put Away task must do the following:

1. Determine its storage type (otherwise, a miscellaneous type).
2. If no type, find any miscellaneous bin that is empty.
3. If a type, find a bin of that type. If there's no space, look for another bin of that type until an item can be inserted and stored.

> **The primary issue:** putting away items when most storage slots are full or near-full, subject to the constraint that items of like storage type must be binned together, leads to significant inefficiencies.

**This proposal is meant to alleviate that problem.**

---

## Overview

We propose a solution that upgrades the overall storage experience and increases the efficiency of the put-away task.

We first introduce the **Warehouse Builder**, a 3D isometric block builder that captures the geometry of the warehouse as well as type and capacity information. It can be seen here: [WarehouseBuilder](https://quirps.github.io/Warehouse-Improvement/).

There are **two main features** to see there, referenced in the WarehouseBuilder Demo App linked above:

- **The builder** - found in the Builder tab, top center of the screen. This lets users create warehouses and get a rough geometric mapping of storage slots, enabling them to navigate to a given bin efficiently.
- **The usability** - how this will be used in practice. The primary motivation is to aid the *put-away* task: when an item is scanned for put-away (Manage Inventory in the Swedemom app), a warehouse map will grey out all storage slots that aren't compatible with the item (either full, or a type mismatch) and display color-coded capacity statuses on all compatible storage slots.

---

## Implementation To-Dos

### Main Points

#### How do we manage the dynamic capacity state of storage slots as items are pulled and put away?

As of now, we're planning on 3 capacity states: **Full**, **Nearly Full**, **Plenty**, since the **vast majority** of storage slots have very little room, if any. We'd also track capacity with a float between 0 and 1 (inclusive), in case we build automated tracking methods in the future.

Currently, we anticipate a user manually selecting the capacity status whenever an item change is made at a given storage slot.

There is likely some room for automated assistance, for example, automatically bumping a storage slot down to "Nearly Full" when an item is pulled from a "Full" slot.

#### Identifying storage types of items

At the time of writing, the precision with which item types are currently stored is unknown. Operating on the assumption we don't have storage types, we'd need to create a classification schema that approprietly mapped to a set like this [StorageType](#storagetype).

#### Identifying storage types of storage slots

This is potentially an easier task once the item-type problem above is solved. We can likely use a **majority-wins rule**, where the item type with the largest quantity in a given bin designates that bin's storage type. More on this later.

#### Layout / Usage

[Potential Layout](readme-rss/ActivityManagement.jpg)

We propose placing the 3D warehouse viewer in the left column. Users would have the choice to enter a bin location manually, or select one by clicking on it in the viewer.

The put-away flow would likely be:

> 1. Scan the item.
> 2. Select the desired compatible storage slot in the viewer (this sets the bin location).
> 3. Place the item(s) in the storage slot.
> 4. Mark "Put away item" for the first time.
> 5. Select the capacity status.
> 6. Continue as normal.

Capacity status selection is included at this step to avoid having to redo it later due to failed put-away errors on particular items.

#### Warehouse Builder Editing Permissions

This could be a pre-designated permission for higher-clearance staff, so as not to create a new permission type.

> Including: Daniel H, Daniel S, Ryan G

---

## New Endpoints

### `GET /warehouse-layout`

Called each time a warehouse is selected. Returns the *latest* warehouse file (`wh.json`) the renderer expects to receive.

| | Fields |
|---|---|
| **Request** | `warehouse_id : str` *(MH, CW)* |
| **Response** | `wh.json` warehouse file |

### `GET /storage-slots/compatibleWithItem`
Here `StorageSlot` could simply be the two digit alphanumeric id along with capacity and item type for that slot.
| | Fields |
|---|---|
| **Request** | `itemType : str` |
| **Response** | `compatibleStorageSlots : StorageSlot[]` |

---

## Modified Endpoint and Migrations

It's currently unknown whether item types exist in a form compatible with storage types, so we'll operate on the assumption that we're extending the `Item` object returned by `/InventoryItem/GetInventoryItemByPartNumber` with our desired response field.

### `GET /InventoryItem/GetInventoryItemByPartNumber`

**Param:** `partNum : str`, e.g. `NSM31785`

**Test response object:**

```json
{
    "Success": true,
    "Data": {
        "ItemID": 433782,
        "PartNum": "NSM31785",
        "ThumbnailImage": "https://pictures.swedemom.com/pictures/2026-02/NSM31785a.jpg",
        "BinLocation": "MHF0",
        "BinQuantity": 1,
        "QuantityAvailable": 1,
        "HasBeenReportedMissing": false,
        "HasOpenMissingIssue": false,
        "OpenMissingIssueID": null,
        "HasLiveListing": true
    },
    "Messages": [],
    "TotalCount": null
}
```

We'd want to add a `StorageType` field, an enum of storage types, which currently sits at:

#### StorageType
```
enum StorageType {
    DVD, VHS, RECORD, CD, CLOTHES, BIG, BREAKABLE, MISC, BOOKS
}
```

### Storage Migration

Anticipated migrations:

1. Assign Item tables a `storageType` enum.
2. Assign storage slots (bins) a `storageType` enum. (This can be calculated per item move and the result cached each time.) This would use a winner-takes-all rule: sum over all items in the storage slot, and pick the type with the max count as the official storage type, provided that count exceeds a global threshold (say, 10 items); otherwise the slot is classified as `MISC`. If there's a tie, and all tied types are above the threshold, choose the first type alphanumerically. (Hopefully, preliminary data analysis lets us avoid these arbitrary tie-break situations altogether.)
3. Store warehouse files. Relatively small (~90 KB) for now, though more storage slots will be added over time; the JSON schema is also inefficient and can be compressed further.


---

## Future Abstractions

We'd like to forecast the future efficiencies we can unlock with minimal changes to the proposed infrastructure.

#### Finer storage position information

Even now, multiple boxes can share a given storage slot, which naturally leads to a more precise ID convention, e.g., a triple ID like `JA0` instead of a double alphanumeric.

For compact media, periodic tags on the bin edges with a 2-digit numeric ID could be used to divide the box. These 2-digit intra-box IDs would then be concatenated with the slot ID - e.g. `JA03` (`JA` the storage slot Id, `03` the intra box Id). 

This could potentially be a simple migration of intra storage ids associated with each item. 

# Note to the readers

This isn't a complete proposal as of writing, but is being worked on and ultimately meant to garner interest/criticisms in hopes of leading to a finalized implementation. 