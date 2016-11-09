var fs = require('fs');

if (process.argv.length != 4) {
    console.log("usage: node assembler.js program outfile");   
}

var insts =     ["halt", "add", "sub", "and", "or", "lshift", "rshift", 
                 "mova", "movr", "load", "store", "lui", "lli", "cmp", 
                 "4bitstrfind", "inc", "bnci", "bnei", "blti", "bi"];

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
var outfile = process.argv[3];

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
            var labelName = parts[1];
            labelsToAddresses[labelName] = address;
        } else {
            address++;  // label lines don't have an address
        }
    });

    console.log(labelsToAddresses);
    
    lines.forEach(function(l) {
        var parts = l.split(" ");

        if (parts[0].toLowerCase() === "label") {
            var labelName = parts[1];
            labelsToAddresses[labelName] = address;
        } else {
            writeMachineCodeForLine(l, outfile);
            address++;
        }

    });
});

var writeMachineCodeForLine = function(l, outfile) {
    var inst = l.split(" ")[0];
    if (inst === "4bitstrfind") { inst = "fbitstrfind"; }
    var op = instsToOps[inst];
    console.log(op);
};

