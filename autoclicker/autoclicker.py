import pyautogui
from pynput import mouse
import pyscreeze
import pydirectinput

# fourCorners = []
oneLine = None
positionOfGame = (490, 627)

buttonKey = {
    'green': 's',
    'red': 'd',
    'blue': 'j',
    'yellow': 'k'
}

buttonLocations = {
    'green': None,
    'red': None,
    'blue': None,
    'yellow': None
}

buttonColor = {
    'green': None,
    'red': None,
    'blue': None,
    'yellow': None
}


print('click on mionitoring region')

def on_click(x, y, button, pressed):
    global oneLine
    if (not pressed):
        return

    if button == mouse.Button.left:
        oneLine = y
        # fourCorners.append(pyautogui.position())

listener = mouse.Listener(on_click=on_click)
listener.start()

while (
    oneLine is None
    # len(fourCorners) < 4 # tl dl tr dr
):
    pass

listener.stop()
listener.join()

LTWH = (0, oneLine, pyautogui.size()[0], 5)
# LTWH = ( fourCorners[0][0], fourCorners[0][1], abs(fourCorners[0][0] - fourCorners[2][0]), abs(fourCorners[0][1] - fourCorners[1][1]))
# print(LTWH)

print('Click on screen and set up things')

def on_click(x, y, button, pressed):
    if (not pressed):
        return

    availableSpaces = list(filter(lambda x: buttonLocations[x] is None, buttonLocations.keys()))
    nextVal = availableSpaces[0]
    if button == mouse.Button.left:
        buttonLocations[nextVal] = pyautogui.position()

listener = mouse.Listener(on_click=on_click)
listener.start()

while (
    len(list(filter(lambda x: x is None, buttonLocations.values())))
):
    pass

listener.stop()
listener.join()

print(buttonLocations)

print('click on the color most similar to the collor u need to click on or something')

def on_click(x, y, button, pressed):
    if (not pressed):
        return

    availableSpaces = list(filter(lambda x: buttonColor[x] is None, buttonColor.keys()))
    nextVal = availableSpaces[0]
    if button == mouse.Button.left:
        buttonColor[nextVal] = pyautogui.screenshot().getpixel((x, y))

listener = mouse.Listener(on_click=on_click)
listener.start()

while (
    len(list(filter(lambda x: x is None, buttonColor.values())))
):
    pass

listener.stop()
listener.join()

print(buttonColor)

import threading
def closeEnough(one, two):
    return len(one) == len(two) and (filter(lambda x: x < 20, [abs(one[i] - two[i]) for i in range(len(one))]))

colors = [ 'green', 'red', 'blue', 'yellow' ]

pydirectinput.PAUSE = 0
def screenShotMoveAndPress():
    # every 60 frames
    threading.Timer(1/85, screenShotMoveAndPress).start()
    button2Press = []
    img = pyautogui.screenshot(region=LTWH)

    for color in colors:
        for y in range(5):
            pixel = img.getpixel((buttonLocations[color][0], y))
            if (pixel == buttonColor[color]):
                button2Press.append(buttonKey[color])
            break

    pydirectinput.press(button2Press, _pause=False)
    img.close()

print("Starting auto clicker or something")
screenShotMoveAndPress()
