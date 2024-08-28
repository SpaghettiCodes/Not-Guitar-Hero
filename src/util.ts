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

const processCSV = (csv_contents: string) =>
    csv_contents
        .split("\n")
        .splice(1) // remove csv header
        .map((line) => line.split(","));

// function quickSort

// function toSorted<T>(array: ReadonlyArray<T>): ReadonlyArray<T> {
// }

export { removeElement, insertElement, processCSV };
