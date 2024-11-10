import fs from "fs";
import path from "path";

export function dumpContractAddress(name: any, address: any, network: any) {
  var addressFile = path.join(__dirname, "./../../deployed_address.json");
  var dump: Record<string, any> = {};

  try {
    dump = JSON.parse(fs.readFileSync(addressFile, "utf8"));
  } catch (e) {
  } finally {
    if (dump[network] === undefined) {
      dump[network] = {};
    }
    dump[network][name] = address;
  }

  try {
    fs.writeFileSync(addressFile, JSON.stringify(dump, null, 2), {
      flag: "w+",
    });
  } catch (e) {
    console.log(e);
  }
}

export function getContractAddress(name: any, network: any) {
  var addressFile = path.join(__dirname, "./../../deployed_address.json");
  var dump: Record<string, any> = {};

  try {
    dump = JSON.parse(fs.readFileSync(addressFile, "utf8"));
  } catch (e) {
  } finally {
    if (dump[network] === undefined) {
      return undefined;
    }
    return dump[network][name];
  }
}
