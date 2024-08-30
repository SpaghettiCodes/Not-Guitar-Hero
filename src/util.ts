function removeElement<T>(
    array: ReadonlyArray<T>,
    element: T,
): ReadonlyArray<T> {
    const indexOfElement = array.indexOf(element);
    if (indexOfElement < 0) return array;
    return [
        ...array.slice(0, indexOfElement),
        ...array.slice(indexOfElement + 1, array.length),
    ];
}

function insertElement<T>(
    array: ReadonlyArray<T>,
    element: T,
): ReadonlyArray<T> {
    const indexOfElement = array.indexOf(element);
    if (indexOfElement < 0) return array.concat(element);
    // already exist, why does it already exist?
    return array;
}

const processCSV = (
    csv_contents: string,
): ReadonlyArray<ReadonlyArray<string>> =>
    csv_contents
        .split("\n")
        .splice(1) // remove csv header
        .map((line) => line.split(","));

// function quickSort

const negate =
    <T>(f: (a: T) => (b: T) => boolean) =>
    (a: T) =>
    (b: T): boolean =>
        !f(a)(b);

function sorted<T>(
    array: ReadonlyArray<T>,
    comp: (a: T) => (b: T) => boolean,
): ReadonlyArray<T> {
    if (!array.length) return [];
    const partition = array[0];
    return [
        ...sorted(array.slice(1).filter(comp(partition)), comp),
        partition,
        ...sorted(array.slice(1).filter(negate(comp)(partition)), comp),
    ];
}

function calculateAccuracy(hit: number, total: number) {
    if (total === 0) {
        return 100;
    }
    return (hit / total) * 100;
}

export { removeElement, insertElement, processCSV, sorted, calculateAccuracy };
