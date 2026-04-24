export type FranchiseCode =
  | "CSK"
  | "MI"
  | "RCB"
  | "KKR"
  | "SRH"
  | "RR"
  | "PBKS"
  | "DC"
  | "LSG"
  | "GT";

export type FranchiseInfo = {
  code: FranchiseCode;
  name: string;
  city: string;
  status: "Ready" | "Not Logged In";
  username: string;
  password: string;
};

export const FRANCHISES: FranchiseInfo[] = [
  {
    code: "CSK",
    name: "Chennai Super Kings",
    city: "Chennai",
    status: "Ready",
    username: "csk@franchise",
    password: "CSK@9153",
  },
  {
    code: "MI",
    name: "Mumbai Indians",
    city: "Mumbai",
    status: "Ready",
    username: "mi@franchise",
    password: "MI@4721",
  },
  {
    code: "RCB",
    name: "Royal Challengers Bengaluru",
    city: "Bengaluru",
    status: "Ready",
    username: "rcb@franchise",
    password: "RCB@8392",
  },
  {
    code: "KKR",
    name: "Kolkata Knight Riders",
    city: "Kolkata",
    status: "Ready",
    username: "kkr@franchise",
    password: "KKR@6284",
  },
  {
    code: "SRH",
    name: "Sunrisers Hyderabad",
    city: "Hyderabad",
    status: "Ready",
    username: "srh@franchise",
    password: "SRH@8047",
  },
  {
    code: "RR",
    name: "Rajasthan Royals",
    city: "Jaipur",
    status: "Ready",
    username: "rr@franchise",
    password: "RR@1936",
  },
  {
    code: "PBKS",
    name: "Punjab Kings",
    city: "Mullanpur",
    status: "Ready",
    username: "pbks@franchise",
    password: "PBKS@5581",
  },
  {
    code: "DC",
    name: "Delhi Capitals",
    city: "Delhi",
    status: "Ready",
    username: "dc@franchise",
    password: "DC@7402",
  },
  {
    code: "LSG",
    name: "Lucknow Super Giants",
    city: "Lucknow",
    status: "Ready",
    username: "lsg@franchise",
    password: "LSG@9914",
  },
  {
    code: "GT",
    name: "Gujarat Titans",
    city: "Ahmedabad",
    status: "Ready",
    username: "gt@franchise",
    password: "GT@2679",
  },
];

export const FRANCHISE_BY_CODE = Object.fromEntries(
  FRANCHISES.map((franchise) => [franchise.code, franchise]),
) as Record<FranchiseCode, FranchiseInfo>;
