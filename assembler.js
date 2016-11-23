var fs = require('fs');

if (process.argv.length != 4) {
    console.log("usage: node assembler.js program outfile");   
}

var instsToOps = {
    halt:   "01000",
    add:    "01010",
    sub:    "01011",
    and:    "01100",
    or:     "01101",
    lshift: "01110",
    rshift: "01111",
    mova:   "10000",
    movr:   "10001",
    lui:    "10010",
    lli:    "10011",
    cmp:    "10100",
    fbitstrfind:    "10101",  // special case since var cant start w num
    inc:    "10110",
    load:   "10111",
    store:  "11000",
    bnci:   "0000",
    bnei:   "0001",
    blti:   "0010",
    bi:     "0011"
};

var labelsToAddresses = {};     // to be populated while parsing
var targetsToIDs = {};          // maps targets (branch address - current address) to a unique id. the instruction will contain the id. 

var program = process.argv[2];
var outfile = process.argv[3];  // make sure that outfile doesn't already exist! we'll be appending to it if it does.

console.log("Assembling " + program + " to " + outfile + "...");
fs.readFile(program, "utf-8", function(err,fileData) {
    if (err) {
        return console.log(err);
    }
    lines = fileData.split('\n');
    
    // get rid of comments
    lines = lines.map(function(l) {
        var commentIdx = l.indexOf('//');
        if (commentIdx != -1)
            return l.substring(0, commentIdx).trim();
        else
            return l.trim();
    });
    
    // get rid of empty lines
    lines = lines.filter(function(l) {
        return l != ''; 
    });
    
    // get a table of labels to addresses
    var address = 0;
    lines.forEach(function(l) {
        var parts = l.split(" ");
        if (parts[0].toLowerCase() === "label") {
            var labelName = parts[1].replace(":","");
            labelsToAddresses[labelName] = address;
        } else {
            address++;  // label lines don't have an address
        }
    });
    
    console.log("Labels to Addresses:");
    console.log(labelsToAddresses);
    
    // write the machine code for each line
    address = 0;
    lines.forEach(function(l) {
        var parts = l.split(" ");

        if (parts[0].toLowerCase() === "label") {
            var labelName = parts[1];
            labelsToAddresses[labelName] = address;
        } else {
            writeMachineCodeForLine(l, address, outfile);
            address++;  // label lines don't have an address
        }

    });

    console.log("Targets to target IDs:");
    console.log(targetsToIDs);

    console.log("\n\n\n");
});

var writeMachineCodeForLine = function(l, address, outfile) {
    var parts = l.split(" ");
    var inst = parts[0];
    if (inst === "4bitstrfind") { inst = "fbitstrfind"; }
    var op = instsToOps[inst];
    
    var machineCode = op;  
    
    switch (inst) {
        case "halt":    
            machineCode += "0000"; break;

        case "add": case "sub": case "and": case "or": case "lshift": case "rshift": 
        case "mova": case "movr": case "load": case "store": case "cmp": case "fbitstrfind":
        case "inc":
            machineCode += regNum(parts[1]); break;

        case "lui": case "lli":
            machineCode += fourBitImm(parts[1]); break;

        case "bnci": case "bnei": case "blti": case "bi":
            machineCode += target(parts[1], address); break;
    }

    fs.appendFileSync(outfile, machineCode + "\n");
};

/*
 * Takes a register string in the format of $rN where N is a number 0 thru 15 and
 * returns a 4 char binary string representating that number.
 *
 * Anything other than this format will cause an exception.
 */ 
var regNum = function(s) {
    if (s === "$ac") {
        return "0000";
    }
    if (s.substring(0,2) !== "$r" || isNaN(parseInt(s.substring(2))) ) {
        console.log("ERROR: Expected a register in the format $rN where N is a number from 0 to 15");
        console.log("got "+s+" instead");
        process.exit();
    }
    return fourBitImm(s.substring(2));
};

/*
 * Takes a string s representing a number in decimal or hexadecimal, and returns the 
 * binary string representation as four bit immediate.
 */
var fourBitImm = function(s) {
    var n = parseInt(s).toString(2);  
    var padZeroes = 4 - n.length;
    if (padZeroes < 0) {
        console.log("ERROR: Got register number not within the range 0-15");
        process.exit();
    }
    return "0".repeat(padZeroes) + n;
};

/*
 * Takes a label name and the instruction's address, and returns the targetID, 
 * which is an index into a table of targets (label address - instruction address). 
 * The processor will use this index to lookup the actual target to calculate the branch address.
 */
var target = function(s, address) {
    if (!labelsToAddresses.hasOwnProperty(s)) {
        console.log("ERROR: Invalid label " + s);
        process.exit();
    }
    if (address < 0) {
        console.log("ERROR: Invalid address " + address);
        process.exit();
    }
    
    var numTargetIDs = Object.keys(targetsToIDs).length;
    if (numTargetIDs > 31) {
        console.log("ERROR: Too many unique targets (more than 32)");
        process.exit();
    }

    var targ = (labelsToAddresses[s] - address);

    var targetID;
    if (targ in targetsToIDs) {
        targetID = targetsToIDs[targ];
    } else {
        targetID = numTargetIDs++;
        targetsToIDs[targ] = targetID;
    }
    
    var targetIDStr = parseInt(targetID).toString(2);
    var padZeroes = 5 - targetIDStr.length;
    return "0".repeat(padZeroes) + targetIDStr;
};

