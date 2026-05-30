const dataWithArray = {
    a: 1,
    b: [{ c: 2 }, 3],
    c: [{ a: 2, b: 3 }],
};

const keysToOmit = ['b', 'e'];
const result = deepOmit(dataWithArray, keysToOmit);
const expected = {
    a: 1,
    c: [{ a: 2 }],
};
console.log(result)


export default function deepOmit(val, keys) {
    let ans = {};
    for (let [k, v] of Object.entries(val)) {
        if (keys.includes(k)) {
        } else if (typeof v === "object") {
            if (Array.isArray(v) && typeof v[0] !== 'object') {
                ans[k] = v;
            } else {
                let io = v.map((item) => deepOmit(item, keys))
                console.log("i", io)
                ans[k] = io;
            }
        } else {
            ans[k] = v;
        }
    }
    return ans;
}