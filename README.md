### Warehouse PutAway Improvement 
Swedemom's warehouse contains thousands of items contained in hundrends of **storage slots**, most of which are at max capacity. Currently storage slots (bins that store items labelled with a 2 character alpha-numerical id) don't contain any capacity nor spatial information, which makes putting items into storage tedious. A further complication is certain items have implicit storage types, as they either compact well when placed in the same bins or binned for other reasons (breakables, big, small items), yet this information doesn't exist or is not yet integrated. 

Currently a user performing the Put Away task must do the following:

* Determine its storage type (otherwise a miscellaneous type)
* If no type, find any miscellanous bin that is empty
* If a type, find a bin of that type, if there's no space look for another bin of that type until you eventually can insert the item and store it. 

The main issue is this process of finding a storage slot with the given type constrained to the fact a large majority of storage slots are at max capacity, can lead to an large inefficiences.

**This proposal is meant to alleviate the latter problems** 

### Overview 

We propose a multifacted solution that intends to upgrade the current overall storage experience as well as increase the effciency in the put away task. 

We first introduce the warehouse builder, an 3D isometric block builder that captures the geometry of the warehouse as well as type and capacity information (https://quirps.github.io/Warehouse-Improvement/)[WarehouseBuilder]. 

There are **two main features** to see here, which can be referenced in the WarehouseBuilder Demo App linked previously:
* The builder, which can be seen in the Builder tab, the top center of the screen. This enables the user to create warehouses and get a rough geometric mapping, giving users a familiar map to know precisely where to go in order to interact with a given storage slot. 
* The usability, how this will be used in practice. The primary motivation for this is to aid the put away task, hence when an item is now scanned for put away (Manage Inventory in the swedemom app), there will now be a warehouse map greys out all storage slots that aren't compatible with the item type (either due to being full or type discrepancy) and in turn show color-coded capacity statuses on all available storage slots. 

There is still work to be done to implement this. 

### How are we managing the dynamic capacitiy state on storage slots?
As of now we're planning on 3 capacity states: Full, Nearly Full, Plenty, as most storage slots have very little room. This would likely be a manual 

Also a fixed  

### Identifying storage types of items
Currently at the time of writing this, the precision of how item types are stored is unknown, so the difficulty in mapping these types to storage types is also unknown. On the plus side, this is a helper type addition rather than an authorative, meaning it's augmenting the user in a way to complete a task more efficiently instead of depending on this tool to get a task done properly. 

### Identifying storage types of storage slots
This is potentially an easier task if the latter problem is solved. We can likely get away with a *majority wins* rule, where the item type with the largest quantity in that bin designates the box type. 


#### Permissions
Warehouse Manager(s)

### New Endpoints

#### GET /warehouse-layout
Set to retrieve each time a warehouse is selected. Returns the warehouse file (wh.json) the renderer is expecting to receieve.

- Request - Fields: [ warehouse_id : str] //MH, CW
- Response - wh.json Warehouse file

#### GET /storage-slots/compatibleWithItem 
- Request - Fields: [ itemType : str]
- Response - [compatibleStorageSlots : StorageSlot[]]



### Modified Endpoint and Migrations
Unknown if item types exist and if so are compatible with storage types, so we'll operate on our naive assumption of the Item object received from */InventoryItem/GetInventoryItemByPartNumber* and append our desired response. 

#### GET */InventoryItem/GetInventoryItemByPartNumber*
- Param partNum : str // NSM31785
Test response object 
``` 
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
Here we'd want to add a "StorageType" field, which is an enum of storage types which currently sits at:

enum StorageType{ 
    DVD,VHS,RECORD,CD,CLOTHES,BIG,BREAKABLE,MISC,BOOKS
}

##### Storage Migration
Anticipated migrations here would be:
1. Assigning Item tables with a storageType enum.
2. Assigning storage slots (bins) a storageType enum // (This can be calculated per item move and cache the result each time) 
This would be the winner takes all being the official storageType (summing over all of the storage slot's items and picking the max item, if the winner doesnt exceed a given global threshold (say 10 items, we call it misc type)) If there's a tie and all items in the tie are above threshold, choose the first type via alpha numeric (hopefully from a prelimiinary data analysis we can get rid of these arbitrary situations above threshold so )

### Future Abstractions

We would like to forecast the future efficiences we can knock out with minimal changes to the proposed infrastructure. 

#### Finer storage position information 
Even now we have multiple boxes in a given storage slot, which naturally leads to a more precise id convention (triple JA0 instead of a double alphanumeric). 

A more precise, affordable solution would be to try and get intra-box proximity spatial information. The rough idea would be to have bar codes lining the upper perimeter of the storage boxes, these bar codes are **intra-box geometric location tags**. 

The flow for moving items would also change. Now when an item is scanned, we'd begin initiate a flow that leads next to an awaited positional bar code for the given storage slot.  