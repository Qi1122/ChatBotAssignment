    var response='Hello';
    console.log(event)
    switch (event.data) {
        case 'Hi':
            response ='Welcome';
            break;
        case 'How are you?':
            response =' I am good, what can I do for you?';
            break;
                
        default:
            // code
    }

    
    callback(null, response);
};