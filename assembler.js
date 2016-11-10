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
    load:   "10010",
    store:  "10011",
    lui:    "10010",
    lli:    "10011",
    cmp:    "10100",
    fbitstrfind:    "10101",  // special case since var cant start w num
    inc:    "10110",
    bnci:   "0000",
    bnei:   "0001",
    blti:   "0010",
    bi:     "0011"
};

var labelsToAddresses = {};  // to be populated while parsing

var program = process.argv[2];
var outfile = process.argv[3];  // make sure that outfile doesn't already exist! we'll be appending to it if it does.

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
    var numZeroes = 4 - n.length;
    if (numZeroes < 0) {
        console.log("ERROR: Got register number not within the range 0-15");
        process.exit();
    }
    return "0".repeat(numZeroes) + n;
};

/*
 * Takes a label name and the instruction's address, and returns the target, which is equal to
 * (label address) - (instruction address). Will be returned as a 5 bit binary string.
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
    var n = (labelsToAddresses[s] - address);
    console.log(address + " " + n);

    if (n > 0) {
        n = parseInt(n).toString(2);
        var numZeroes = 5 - n.length;  // guaranteed to be from 0 to 5 inclusive
        return "0".repeat(numZeroes) + n;

    } else { 
        return ((n >>>0) & 0x1F).toString(2);  // 5 bit negative number
    }
};

